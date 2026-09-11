# HAN's AI Studio

HAN's AI Studio is my personal AI system. Its purpose is to organize and coordinate my AI agents, workflows, tools, skills, plugins, knowledge, and projects. The goal is not only to use AI, but to learn how to understand, manage, and coordinate AI agents as a reliable system.

## Current AI Agents

HAN's AI Studio currently uses three primary AI agents.

Each agent has a different primary responsibility:

* **ChatGPT** — Thinking, Learning, Research, and Planning
* **Codex** — Software Engineering and Technical Execution
* **Gemini Enterprise** — Enterprise Knowledge, Workflow, and Agent Orchestration

The goal is not to make every agent perform every task.

The system should assign each task to the agent that is best suited for it, while HAN remains responsible for final review, learning, and decision-making.

---

### 1. ChatGPT

**Primary Role:** Thinking, Learning, Research, Planning, and AI Studio Coordination

ChatGPT serves as the primary thinking and learning layer in HAN's AI Studio.

Its role is to help HAN understand concepts, analyze problems, conduct research, organize knowledge, develop plans, design workflows, and determine how tasks should be distributed across the AI Studio.

**Core Responsibilities:**

* Learning and explanation
* Reasoning and problem solving
* Research and information analysis
* Planning and decision support
* Knowledge organization
* File and document analysis
* Workflow design
* System architecture discussion
* Reviewing outputs produced by other AI agents
* Coordinating tasks across HAN's AI Studio

**Current Capabilities and Equipment:**

* GPT-5.6 Sol
* Conversation context and Memory
* Web search and research
* File analysis
* Document creation and editing capabilities
* PDF creation and editing capabilities
* Presentation creation and editing capabilities
* Spreadsheet creation and analysis capabilities
* GitHub integration
* Plugins
* Connected Apps where available
* Reusable Skills where supported
* Plugin Management

**Plugin and Skill Architecture:**

ChatGPT Plugins can package reusable workflow capabilities.

Depending on the Plugin, it may contain:

* Skills
* Connected Apps
* Workflow instructions
* App templates

Skills provide reusable instructions, examples, workflows, or supporting code for specific tasks.

Connected Apps provide access to external services, information, and supported actions.

Actual availability depends on the ChatGPT plan, workspace, product surface, permissions, and authorization.

**GitHub Integration Status:**

* GitHub integration is installed.
* Repository read access has been confirmed.
* HAN's repositories can be used as project context where permitted.
* GitHub permissions should always be checked before allowing write operations.
* HAN will continue learning Git manually before heavily automating repository operations.

**Current Configuration Decision:**

* Keep ChatGPT as the main thinking and learning agent.
* Keep the current core capabilities.
* Learn Plugins, Skills, Tools, Connected Apps, and Permissions gradually.
* Install new Plugins only when they solve a real workflow requirement.
* Do not create unnecessary custom Skills yet.
* Validate workflows manually before converting them into reusable automation.

**Position in HAN's AI Studio:**

Think
→ Learn
→ Research
→ Analyze
→ Plan
→ Review
→ Coordinate

---

### 2. Codex

**Primary Role:** Software Engineering and Technical Execution

Codex serves as the primary software engineering agent in HAN's AI Studio.

Its role is to convert clear requirements and approved plans into working technical implementations.

Codex should handle software construction, modification, testing, debugging, repository operations, and other engineering tasks that require direct interaction with code and development environments.

**Core Responsibilities:**

* Writing and modifying code
* Understanding existing codebases
* Implementation planning
* Code review
* Bug detection
* Testing and debugging
* Refactoring
* Working with project files and folders
* Git operations and version control
* GitHub repository operations
* Creating branches and commits
* Creating and reviewing Pull Requests
* Testing web projects
* Maintaining software projects over time

**Current Capabilities and Equipment:**

* GitHub integration
* Local project file access
* Plan Mode
* Review Agent
* Skill Creator
* Plugin Creator
* Skill Installer
* OpenAI documentation resources
* Image generation where required
* Plugins and Apps
* MCP server support
* Runtime and terminal-based engineering tools
* Built-in browser
* Worktree support
* Hooks
* Local development environment access
* SSH-based workflows where configured

**Plugin and Skill Architecture:**

Codex can use Plugins that package engineering workflows, Skills, and supported Apps.

This allows Codex to gradually evolve from a general coding agent into a more specialized engineering environment for HAN.

Potential future reusable Skills may include:

* HAN Coding Workflow
* Electronic Engineering Project Setup
* Embedded Systems Project Workflow
* Testing Workflow
* Git/GitHub Workflow

These should only be created after the corresponding manual workflow has been tested repeatedly.

**Project and Workspace Rule:**

* Codex must be connected to the correct project before implementation begins.
* The intended repository, branch, workspace, and permissions should be verified.
* Local file creation and modification have already been successfully tested.
* Automated implementation should not begin until project context is clear.

**Current Coding Workflow:**

Requirement
→ ChatGPT / HAN Review
→ Technical Plan
→ HAN Approval
→ Workspace and Permission Check
→ Codex Implementation
→ Testing
→ Code Review
→ Git Branch
→ Commit
→ Push
→ Pull Request when required
→ HAN Review
→ Merge

A Pull Request is not mandatory for every small personal project. Direct work on `main` may be acceptable for simple, low-risk personal changes when HAN intentionally chooses that workflow.

**Current Git Configuration:**

* Branch prefix: `codex/`
* Pull Request merge method: Merge
* Force Push: Disabled
* Draft Pull Requests: Enabled
* Review presentation: Inline
* Automatic merging and PR monitoring: Disabled
* Custom Commit instructions: Not configured yet
* Custom Pull Request instructions: Not configured yet

**Browser and Computer Use Policy:**

* Prioritize the Codex development environment and built-in browser for software testing.
* External actions requiring additional permissions should remain controlled.
* Do not grant unnecessary system access.
* Expand permissions only when a validated workflow requires them.

**Worktrees and Hooks:**

* Worktrees may later support parallel development across multiple branches.
* Automatic cleanup of old managed Worktrees may remain enabled.
* No custom Hooks are currently required.
* Hooks should only be introduced after repetitive engineering operations have been identified.

**Current Configuration Decision:**

* Keep GitHub as a core integration.
* Prioritize coding, Plan Mode, Review, Git, testing, debugging, and project access.
* Do not install integrations without a concrete engineering requirement.
* Do not create a complete HAN Coding Workflow Skill yet.
* First execute the complete workflow manually several times.
* Automate only the steps that prove repetitive and stable.

**Position in HAN's AI Studio:**

Build
→ Code
→ Test
→ Debug
→ Refactor
→ Version
→ Maintain

---

### 3. Gemini Enterprise

**Primary Role:** Enterprise Knowledge, Workflow, Automation, and Agent Orchestration

Gemini Enterprise serves as the enterprise workflow and knowledge layer in HAN's AI Studio.

Its role is broader than research alone.

Gemini Enterprise can combine knowledge sources, Gemini agents, workflow logic, tools, connected applications, human approval, and other agents into structured workflows.

For HAN, its immediate purpose is to learn how AI agents and workflows can transform repeated tasks into reusable systems.

**Core Responsibilities:**

* Enterprise-style knowledge retrieval
* Information synthesis
* Working with files and structured knowledge
* Gemini Notebook-based research and learning
* Creating specialized AI agents
* Building multi-step workflows
* Workflow automation
* Trigger-based execution
* Flow control
* Human approval and review
* Tool and application integration
* Connecting specialized agents
* Experimenting with multi-agent orchestration
* Building repeatable university learning workflows

**Current Platform Capabilities:**

Gemini Enterprise currently provides an architecture that can include:

* Agents
* Workflow Builder
* Gemini Notebook Enterprise
* Knowledge and file sources
* Skills
* Tools
* Connected Apps
* Triggers
* Gemini Agent steps
* Flow control
* Human-in-the-loop steps
* Existing-agent steps
* MCP integrations
* Workflow scheduling
* Workflow versioning
* Workflow execution logs

Availability of individual capabilities depends on the Enterprise environment, administrator configuration, connected data sources, permissions, and enabled features.

**Gemini Notebook Enterprise:**

Gemini Notebook Enterprise provides a source-grounded environment for working with selected materials.

It can be used for:

* Course materials
* PDFs
* Documents
* Slides
* Web sources where supported
* Research materials
* Structured learning
* Source-grounded Q&A
* Summaries and knowledge synthesis

For HAN's university system, Gemini Notebook can become an important knowledge layer for processing lecture and course materials.

**Workflow Builder:**

Workflow Builder is the main workflow construction environment.

It supports no-code and low-code workflow creation using natural-language instructions and a visual editor.

A workflow can contain:

Trigger
→ Input
→ Agent / Action
→ Flow Control
→ Human Review
→ Additional Agent / Tool
→ Output

Workflow Builder can support:

* Manual execution
* Scheduled execution
* App-event triggers where configured
* Multiple workflow steps
* AI Agent steps
* Conditional branching
* Filtering
* Loops
* Human approval
* Existing agents
* Tool usage
* MCP connections
* Workflow testing
* Workflow publishing
* Workflow version management
* Execution logs

**Agents:**

Gemini Enterprise can create specialized agents for specific tasks.

An agent can be configured with:

* Purpose
* Instructions
* Model
* Knowledge
* Files
* Data sources
* Tools
* Subagents
* Scheduling where supported

This allows HAN to eventually create specialized agents such as:

* Lecture Processing Agent
* Electronic Engineering Study Agent
* Research Agent
* Project Knowledge Agent
* University Planning Agent

These agents should only be created when there is a clear recurring task.

**Connected Apps:**

Gemini Enterprise Workflow Builder supports integrations with services such as:

* Gmail
* Google Calendar
* Google Chat
* Google Drive
* Slack
* Jira
* ServiceNow
* Confluence
* OneDrive
* SharePoint
* Outlook

However, platform support does not mean every connector is available in HAN's current account.

Actual access depends on administrator configuration, data stores, permissions, and the specific Enterprise environment.

**Current Rakyat Digital Environment:**

In HAN's currently observed Rakyat Digital Gemini Enterprise environment:

* Google Search is available.
* Gemini Notebook is available.
* Workflow Builder is available.
* Built-in Skills are available.
* Files can be used as context.
* Gmail, Google Calendar, and Google Drive workflow connectors have not yet been confirmed as available in HAN's current interface.

Therefore, these integrations should be treated as platform capabilities rather than confirmed current-account capabilities until tested.

**Built-in Skills Currently Observed:**

* `brand-voice`
* `contract-creation`
* `contract-review`
* `customer-briefing`
* `project-updates`

These Skills are primarily enterprise-oriented and are not currently central to HAN's university workflow.

**MCP:**

Gemini Enterprise Workflow Builder can connect MCP-compatible servers when the required administrator configuration and server access are available.

MCP can extend workflows with external:

* Tools
* Resources
* APIs

This is a future capability for HAN's AI Studio and is not a Phase 2 priority.

**ADK — Agent Development Kit:**

Google's Agent Development Kit provides a code-first framework for building more advanced AI agents and multi-agent systems.

ADK supports:

* Custom agents
* Tools
* Multi-agent architectures
* Workflow agents
* Dynamic agent routing
* Custom orchestration
* Agent deployment

ADK is a future development layer for HAN's AI Studio.

Current priority:

Workflow Builder first
→ Understand Agents
→ Understand Tools
→ Understand Orchestration
→ Build real workflows
→ Learn ADK later

**A2A and Multi-Agent Integration:**

Gemini Enterprise workflows can incorporate supported existing agents, including compatible ADK and A2A agents made available within the organization.

This creates a future path toward multi-agent systems in which specialized agents can hand tasks to one another.

A2A is therefore relevant to the long-term architecture of HAN's AI Studio but is not required for the current minimum viable system.

**Current Configuration Decision:**

* Upgrade Gemini Enterprise from a simple research agent to the Workflow, Knowledge, and Agent Orchestration layer.
* Prioritize Gemini Notebook and Workflow Builder.
* Learn Agents, Tools, Triggers, Flow Control, and Human-in-the-loop through actual use.
* Build one simple university learning workflow before creating many agents.
* Do not prioritize MCP, ADK, or A2A yet.
* Do not assume a connector is available until it has been verified in HAN's actual account.
* Re-evaluate available capabilities when the current Enterprise access changes.

**Position in HAN's AI Studio:**

Knowledge
→ Agent
→ Workflow
→ Automation
→ Orchestration

---

## Three-Agent Division of Labour

The current architecture of HAN's AI Studio is:

**HAN**

↓ Defines goals, reviews outputs, learns, and makes final decisions

**ChatGPT — Chief Thinking & Learning Agent**

Think
→ Learn
→ Research
→ Analyze
→ Plan
→ Review

↓

**Codex — Chief Software Engineering & Technical Execution Agent**

Build
→ Code
→ Test
→ Debug
→ Maintain

↓

**Gemini Enterprise — Chief Enterprise Workflow & Knowledge Agent**

Knowledge
→ Workflow
→ Automation
→ Agent Orchestration

↓

**HAN**

Review
→ Learn
→ Decide
→ Improve

The three agents are not intended to operate as a rigid linear chain for every task.

HAN should select the appropriate agent according to the task.

Examples:

Learning a difficult concept
→ ChatGPT

Building a software project
→ ChatGPT for requirements and planning
→ Codex for implementation

Building a repeatable university learning workflow
→ ChatGPT for system design
→ Gemini Enterprise for workflow construction and experimentation
→ Codex only when custom software or code is required

The long-term objective is:

**Right Agent → Right Task → Right Tool → Human Review**

