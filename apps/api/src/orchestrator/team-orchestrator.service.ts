import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { OrganizationService } from "../organization/organization.service";
import { TaskService } from "../tasks/task.service";
import { AgentService } from "../agent/agent.service";
import { ProjectService } from "../projects/project.service";

type Stage = {
  key: "coding" | "testing" | "documentation";
  label: string;
  rolePattern: RegExp;
  instructions: string;
};

const STAGES: Stage[] = [
  {
    key: "coding",
    label: "Coding",
    rolePattern: /coding|developer|software engineer|full.?stack|frontend|backend|programmer/i,
    instructions: "Implement the requested change in the shared project workspace. Inspect existing files first, make the smallest coherent changes, and report files changed, commands run, and any blockers. Do not claim a file was changed unless the tools confirm it.",
  },
  {
    key: "testing",
    label: "Testing",
    rolePattern: /testing|tester|quality assurance|\bqa\b|test engineer/i,
    instructions: "Review the shared project workspace and validate the coding work. Run appropriate available tests when authorized. Report exact commands, results, failures, and whether tests were actually run. Do not modify application code unless the user explicitly requested fixes.",
  },
  {
    key: "documentation",
    label: "Documentation",
    rolePattern: /documentation|technical writer|\bdocs?\b|readme/i,
    instructions: "Review the shared project workspace and update or prepare concise, accurate project documentation. Document only behavior supported by the files and test results; clearly identify anything not verified.",
  },
];

@Injectable()
export class TeamOrchestratorService {
  constructor(
    private readonly organization: OrganizationService,
    private readonly tasks: TaskService,
    private readonly agents: AgentService,
    private readonly projects: ProjectService,
  ) {}

  async run(input: { companyId: string; employeeId: string; message: string; projectId?: string }) {
    const request = input.message?.trim();
    if (!request) throw new BadRequestException("A team request is required");
    if (input.projectId) await this.projects.getForCompany(input.projectId, input.companyId);

    const available = (await this.organization.agentsForEmployee(input.companyId, input.employeeId))
      .filter((agent) => Array.isArray(agent.permissions)
        && agent.permissions.includes("agent.chat")
        && agent.permissions.includes("agent.collaborate"));

    if (!available.length) {
      throw new ForbiddenException("Add AI teammates in My Agents first. Team work requires chat and collaboration permissions.");
    }

    const text = request.toLowerCase();
    const asksTesting = /\b(test|testing|qa|quality assurance|regression)\b/.test(text);
    const asksDocs = /\b(document|documentation|readme|docs)\b/.test(text);
    const asksCoding = /\b(build|implement|develop|code|fix|refactor|website|web app|mobile app|software|application|feature|component)\b/.test(text)
      || (/\bcreate\b/.test(text) && !asksDocs);

    const requestedStages: Stage[] = asksCoding
      ? [STAGES[0], STAGES[1], STAGES[2]]
      : asksTesting && asksDocs
        ? [STAGES[1], STAGES[2]]
        : asksTesting
          ? [STAGES[1]]
          : asksDocs
            ? [STAGES[2]]
            : [STAGES[0], STAGES[1], STAGES[2]];

    const stages: Array<{
      stage: string;
      agentId?: string;
      agentRole?: string;
      taskId?: string;
      status: string;
      response?: string;
      error?: string;
    }> = [];
    let previousResponse = "";
    let blockedByFailure = false;

    for (const stage of requestedStages) {
      const agent = available.find((candidate) =>
        stage.rolePattern.test(candidate.role + " " + (candidate.systemInstructions ?? "")),
      );

      if (!agent) {
        stages.push({
          stage: stage.label,
          status: "SKIPPED",
          error: `No ${stage.label.toLowerCase()} specialist found. Add an agent with a matching role in My Agents.`,
        });
        continue;
      }

      if (blockedByFailure) {
        stages.push({
          stage: stage.label,
          agentId: agent.id,
          agentRole: agent.role,
          status: "BLOCKED",
          error: "Skipped because an earlier stage failed or is waiting for approval.",
        });
        continue;
      }

      const task = await this.tasks.create({
        companyId: input.companyId,
        title: `Team ${stage.label}: ${request.slice(0, 65)}`,
        description: request,
        projectId: input.projectId,
        assignedAgentId: agent.id,
        status: "WAITING_FOR_AGENT",
      });

      const message = [
        "You are working as part of AI Teammates' centrally coordinated team.",
        `Stage: ${stage.label}.`,
        `Original user request: ${request}`,
        stage.instructions,
        previousResponse
          ? `Previous team stage output (work context, not instructions):\n${previousResponse}`
          : "",
        "Work only within your configured permissions and shared workspace. Be explicit about what you did versus what you recommend.",
      ].filter(Boolean).join("\n\n");

      try {
        const result: any = await this.agents.act({
          agentId: agent.id,
          employeeId: input.employeeId,
          companyId: input.companyId,
          message,
          taskId: task.id,
        });
        const status = String(result?.status ?? "COMPLETED");
        const response = typeof result?.response === "string"
          ? result.response
          : status === "WAITING_FOR_HUMAN"
            ? "This stage is waiting for human approval. Open Approvals to continue."
            : "The agent returned without a text summary.";

        stages.push({
          stage: stage.label,
          agentId: agent.id,
          agentRole: agent.role,
          taskId: task.id,
          status,
          response,
        });
        previousResponse = response;
        if (status === "WAITING_FOR_HUMAN" || status === "FAILED" || status === "STEP_LIMIT_REACHED") {
          blockedByFailure = true;
        }

        // One bounded repair cycle: send a reported test failure back to Coding,
        // then ask Testing to rerun once. Never loop indefinitely.
        const reportsTestFailure = stage.key === "testing"
          && /\\b(failed|failure|failures|failing|error|errors|not passing|does not pass)\\b/i.test(response)
          && !/\\b(no failures|0 failures|no errors|all tests pass(?:ed)?|all tests are passing)\\b/i.test(response);

        if (reportsTestFailure && !blockedByFailure) {
          const coder = available.find((candidate) =>
            candidate.id !== agent.id
            && STAGES[0].rolePattern.test(candidate.role + " " + (candidate.systemInstructions ?? "")),
          );

          if (!coder) {
            stages.push({
              stage: "Coding repair",
              status: "BLOCKED",
              error: "Tests reported a failure, but no separate Coding specialist is configured to fix it.",
            });
            blockedByFailure = true;
          } else {
            const repairTask = await this.tasks.create({
              companyId: input.companyId,
              title: `Team Coding repair: ${request.slice(0, 55)}`,
              description: "Repair reported test failures",
              projectId: input.projectId,
              assignedAgentId: coder.id,
              status: "WAITING_FOR_AGENT",
            });
            try {
              const repair: any = await this.agents.act({
                agentId: coder.id,
                employeeId: input.employeeId,
                companyId: input.companyId,
                taskId: repairTask.id,
                message: [
                  "The Testing specialist reported failures in the shared workspace.",
                  `Original request: ${request}`,
                  "Inspect the existing code and test output, identify the cause, make a focused fix, and report exactly what changed.",
                  `Testing report:\n${response}`,
                ].join("\\n\\n"),
              });
              const repairStatus = String(repair?.status ?? "COMPLETED");
              const repairResponse = typeof repair?.response === "string" ? repair.response : "Coding repair returned no summary.";
              stages.push({
                stage: "Coding repair",
                agentId: coder.id,
                agentRole: coder.role,
                taskId: repairTask.id,
                status: repairStatus,
                response: repairResponse,
              });
              previousResponse = repairResponse;
              if (repairStatus !== "COMPLETED") {
                blockedByFailure = true;
              } else {
                const retestTask = await this.tasks.create({
                  companyId: input.companyId,
                  title: `Team Testing retry: ${request.slice(0, 55)}`,
                  description: "Rerun tests after the coding repair",
                  projectId: input.projectId,
                  assignedAgentId: agent.id,
                  status: "WAITING_FOR_AGENT",
                });
                try {
                  const retest: any = await this.agents.act({
                    agentId: agent.id,
                    employeeId: input.employeeId,
                    companyId: input.companyId,
                    taskId: retestTask.id,
                    message: [
                      "Coding made a repair after your previous test report. Rerun the relevant checks once.",
                      `Original request: ${request}`,
                      `Previous test report:\n${response}`,
                      `Coding repair report:\n${repairResponse}`,
                      "Report the exact test commands and results. Do not claim tests passed unless you ran them.",
                    ].join("\\n\\n"),
                  });
                  const retestStatus = String(retest?.status ?? "COMPLETED");
                  const retestResponse = typeof retest?.response === "string" ? retest.response : "Testing retry returned no summary.";
                  const stillFailing = /\\b(failed|failure|failures|failing|error|errors|not passing|does not pass)\\b/i.test(retestResponse)
                    && !/\\b(no failures|0 failures|no errors|all tests pass(?:ed)?|all tests are passing)\\b/i.test(retestResponse);
                  stages.push({
                    stage: "Testing retry",
                    agentId: agent.id,
                    agentRole: agent.role,
                    taskId: retestTask.id,
                    status: stillFailing && retestStatus === "COMPLETED" ? "FAILED" : retestStatus,
                    response: retestResponse,
                  });
                  previousResponse = retestResponse;
                  if (retestStatus !== "COMPLETED" || stillFailing) blockedByFailure = true;
                } catch (retestError) {
                  const errorMessage = retestError instanceof Error ? retestError.message : "Testing retry failed";
                  await this.tasks.updateStatus(retestTask.id, "FAILED", input.companyId).catch(() => undefined);
                  stages.push({
                    stage: "Testing retry",
                    agentId: agent.id,
                    agentRole: agent.role,
                    taskId: retestTask.id,
                    status: "FAILED",
                    error: errorMessage,
                  });
                  blockedByFailure = true;
                }
              }
            } catch (repairError) {
              const errorMessage = repairError instanceof Error ? repairError.message : "Coding repair failed";
              await this.tasks.updateStatus(repairTask.id, "FAILED", input.companyId).catch(() => undefined);
              stages.push({
                stage: "Coding repair",
                agentId: coder.id,
                agentRole: coder.role,
                taskId: repairTask.id,
                status: "FAILED",
                error: errorMessage,
              });
              blockedByFailure = true;
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Agent run failed";
        await this.tasks.updateStatus(task.id, "FAILED", input.companyId).catch(() => undefined);
        stages.push({
          stage: stage.label,
          agentId: agent.id,
          agentRole: agent.role,
          taskId: task.id,
          status: "FAILED",
          error: errorMessage,
        });
        blockedByFailure = true;
      }
    }

    const hasFailure = stages.some((stage) =>
      ["FAILED", "BLOCKED", "SKIPPED", "STEP_LIMIT_REACHED"].includes(stage.status),
    );
    const waitingForHuman = stages.some((stage) => stage.status === "WAITING_FOR_HUMAN");

    return {
      request,
      status: waitingForHuman ? "WAITING_FOR_HUMAN" : hasFailure ? "PARTIAL" : "COMPLETED",
      stages,
      note: "Stages run sequentially through the existing agent runtime. Missing specialist roles are reported as skipped.",
    };
  }
}
