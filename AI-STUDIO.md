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

* Keep ChatGPT as the main thinking, learning, research, and AI Studio coordination agent.

* Keep the current core capabilities.

* Use an exploration-first but production-controlled approach when learning new Plugins, Skills, Tools, Agents, and Connected Apps.

* HAN may actively explore unfamiliar capabilities through small experiments even before a permanent use case is known.

* Exploration does not automatically make a capability part of the permanent AI Studio.

* Promising capabilities should be tested on real tasks before being promoted into the core system.

* Avoid permanently installing, maintaining, or creating large numbers of overlapping capabilities without demonstrated value.

* Validate important workflows manually before converting stable and repetitive processes into reusable automation.

* Use the following lifecycle when evaluating new AI capabilities:

Explore

→ Prototype

→ Evaluate

→ Candidate

→ Core / Archived

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

* Allow unfamiliar engineering capabilities to be explored through small experiments before deciding whether they belong in the permanent Codex environment.

* Keep permanent integrations and automation limited to capabilities that demonstrate practical value.

* HAN should understand the principles of Git, GitHub, repository structure, branches, commits, pushes, pulls, and reviews even when Codex performs the repetitive operations.

* The initial manual Git learning phase has been completed through real repository work.

* Beginning after the September 2026 AI Studio update, repetitive local repository modification, testing, and Git operations should gradually transition to Codex.

* HAN remains responsible for defining goals, understanding important changes, reviewing results, and approving significant repository actions.

* Do not create a complete HAN Coding Workflow Skill until the real Codex-assisted workflow has been tested repeatedly.

* Automate only the steps that prove repetitive, stable, and useful.

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

**Current HAN Experiment Status: CANDIDATE**

HAN has tested Gemini Notebook with real audio input.

Observed results:

* Audio content could be processed and understood.
* The notebook could generate structured learning outputs from the recording.
* The material could be further transformed into summaries, notes, and other learning formats.
* In one test, processing completed within several minutes.
* A continuing loading state was observed after processing appeared complete.

The continuing loading behavior should currently be treated as an observed issue rather than a confirmed product bug.

For university use, the current prototype workflow is:

Lecture

→ Audio Capture

→ Gemini Notebook

→ Transcript / Understanding

→ Summary / Key Points

→ Study Notes

→ Additional Study Material

The primary objective is information preservation.

Presentation quality such as slides, video, or polished notes is secondary to accurately capturing important lecture content.

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

**First Gemini Workflow Experiment:**

HAN successfully built and tested a first learning workflow inside Gemini Enterprise.

The original workflow included:

Manual Trigger

→ Learning Material Analyzer

→ Learning Content Designer

→ Assessment Planner

→ Assessment Designer

→ Answer & Solution Builder

A lighter version was later tested using:

Learning Material Analyzer

→ Learning Content Designer

During this experiment, HAN learned and used:

* Manual Trigger
* Input and Output configuration
* Variables
* Agent chaining
* Agent instructions
* Workflow testing
* Reset and Run
* Debugging
* Required-input validation

One observed error was:

"workflow failed due to missing required input"

The error occurred because the Manual Trigger did not provide the required Learning Material property in the expected format.

The workflow was successfully debugged and tested.

**Current Status: ARCHIVED — Successful Learning Prototype**

The workflow was not abandoned because it failed.

It was archived because the configuration and maintenance effort was too high compared with simpler alternatives for HAN's real university learning workflow.

Gemini Notebook later proved to be a lower-friction option for processing learning materials and lecture recordings.

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

**Gemini Enterprise Workspace Structure:**

HAN currently uses several Gemini Enterprise conversation spaces with different purposes.

**Persistent / Long-term Spaces:**

* Personal AI Context and Goals
* Skills Blueprint
* New Agent Blueprint

These spaces are intended to preserve long-term context, design history, and reusable system knowledge.

**Temporary / Experimental Space:**

* AI Skill & Agent Clinic

This space is used for temporary exploration, troubleshooting, design discussion, and experimentation. It does not need to be preserved permanently.

The current principle is:

Persistent Context

→ Long-term system knowledge

Temporary Context

→ Working space / experimentation

**Built-in Skills Currently Observed:**

**HAN-Created Gemini Skills:**

**Deep Research Experiment:**

HAN tested Gemini Deep Research as a structured research workflow.

A limitation observed in the current Gemini Enterprise environment is that a custom Skill and Deep Research may not always be directly activated together in the same run.

To work around this, HAN used the following method:

Skill Methodology

→ Extract important constraints and evaluation criteria

→ Convert them into Prompt Instructions

→ Deep Research

→ Research Plan

→ HAN Review

→ Research Execution

This means the Skill itself is not directly controlling Deep Research.

Instead, the Skill's methodology is manually transferred into the prompt and context used by Deep Research.

This approach allows reusable Skill logic to influence research without requiring direct Skill + Deep Research execution.

**Current Status: TESTING**

The method should continue to be evaluated for:

* Constraint preservation
* Research drift
* Technical accuracy
* Practical usefulness
* Suitability for Electronic Engineering Technology research

**Human-in-the-loop Experiment:**

HAN has now used Human-in-the-loop in a real research workflow.

The tested pattern is:

AI Planning

→ Research Plan

→ Human Review

→ Approve / Modify

→ AI Execution

This establishes an important AI Studio principle:

AI agents may perform planning and execution, but significant actions should include human review when judgment, accuracy, cost, permissions, or long-term consequences matter.

Human-in-the-loop should not be added to every workflow unnecessarily.

It is most useful at important decision boundaries.

HAN has created two custom Skills for real experimentation.

### EET Hardware Auditor

Purpose:

Support Electronic Engineering Technology hardware-related research and evaluation.

Potential responsibilities include:

* Component parameter review
* Hardware suitability analysis
* Compatibility checks
* PCB and hardware design risk identification
* Component purchasing judgment
* Engineering-focused technical research

**Current Status: CANDIDATE**

---

### Academic Assistant

Purpose:

Support university academic work related to Electronic Engineering Technology.

Potential responsibilities include:

* Assignment structure
* Lab report support
* Error analysis
* Academic formatting
* Writing organization
* Academic convention checking

**Current Status: CANDIDATE**

These Skills should continue to be tested on real university tasks before being promoted into the Core system.

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

## AI Studio Experiment Lifecycle

HAN's AI Studio uses an exploration-first but production-controlled approach.

New Tools, Skills, Plugins, Agents, Workflows, and integrations may be explored before their long-term usefulness is fully known.

The purpose of exploration is to learn what a capability can actually do.

The standard lifecycle is:

Explore

→ Prototype

→ Evaluate

→ Candidate

→ Core / Archived

### Explore

HAN discovers or intentionally tests an unfamiliar capability.

The goal is learning, not immediate adoption.

### Prototype

A small practical experiment is created.

The experiment should be simple enough to reveal the capability's real behavior.

### Evaluate

The result is reviewed for usefulness, limitations, overlap, reliability, effort, and fit with HAN's goals.

### Candidate

The capability appears useful but still requires real-world testing.

Candidate does not mean permanent adoption.

### Core

The capability has demonstrated repeated practical value and becomes part of the stable AI Studio.

### Archived

The experiment was useful for learning but is not selected for continued use.

Archived does not mean failed.

A successful prototype may be archived when a better or simpler alternative exists.

**System Principle:**

Experiment freely.

Adopt selectively.

Automate carefully.

## Shared Knowledge Base — Selected Architecture

HAN's AI Studio originally relied heavily on HAN manually transferring important information between AI agents. That manual pattern remains useful for review, but it is no longer the intended permanent knowledge architecture.

**Selected durable knowledge layer: Obsidian / Markdown.**

Obsidian is the current external Knowledge Source of Truth for structured long-term knowledge, research, Skills, architecture notes, learning records, and reusable project knowledge. GitHub remains the Engineering Source of Truth for source code, engineering state, build plans, architecture baselines, verification records, and implementation specifications.

Current knowledge architecture:

HAN / Agents
↕
HAN Knowledge Governance + Context Loading
↕
Obsidian / Markdown — durable knowledge
↕
RAG / search indexes — rebuildable retrieval infrastructure

The Stage 10 Knowledge Connector already establishes an explicit reviewed export boundary into Obsidian. Future RAG, vector search, APIs, MCP access, and cross-agent retrieval should extend this architecture rather than replace Obsidian as the durable source.

**Current Status: SELECTED / IMPLEMENTED FIRST BOUNDARY**

### Hybrid Agent Engine Direction

LibreChat has been selected from the 2026-09-18 architecture harvest as a candidate replaceable self-hosted Agent Engine beneath HAN-owned domain, Harness, knowledge-governance, and Experience layers.

Target direction:

HAN Experience
→ HAN Harness
→ HAN Engine Adapter
→ LibreChat Engine
→ Models / MCP Tools / RAG Infrastructure

LibreChat does not become HAN's application identity, Knowledge Source of Truth, or UI shell. Existing persistent Agent identities, Tasks, Executions, Artifacts, Knowledge boundaries, and Obsidian governance remain HAN-owned. Engine integration must occur through an adapter/API boundary and must pass the later Stage 11 security gate and Stage 12 integration proof before becoming part of the sealed Prototype 0 baseline.

The long-term HAN Experience layer includes project workspaces, Agent identity, Activity/Trace, Artifacts, a dedicated Design Workspace, and a future 3D Lobby.

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

## Development Log

### 2026-09-12

* Tested classroom and personal audio capture methods across phone and Windows.

* Evaluated Gemini Notebook using real recorded audio.

* Confirmed Gemini Notebook as a promising lower-friction learning-material processing workflow.

* Created the EET Hardware Auditor Skill.

* Created the Academic Assistant Skill.

* Tested Gemini Deep Research.

* Transferred Skill constraints into Deep Research through prompt instructions.

* Used Research Plan → Human Review → Execution as a practical Human-in-the-loop workflow.

* Reviewed the first Gemini learning Workflow.

* Confirmed that the first Workflow successfully taught Manual Trigger, Variables, Input / Output, Agent chaining, testing, and debugging.

* Archived the first learning Workflow because Gemini Notebook provided a simpler workflow for the same university learning objective.

* Updated the AI Studio philosophy from strict requirement-first adoption to exploration-first, production-controlled experimentation.

## Current Exploration Roadmap

### Obsidian

Research whether Obsidian should become the human-readable Personal Knowledge Base or Knowledge Management layer of HAN's AI Studio.

### Shared Knowledge Base

Research how ChatGPT, Gemini, Codex, and HAN can access shared long-term knowledge without requiring constant manual information transfer.

### NVIDIA

Understand NVIDIA from first principles:

GPU

→ CUDA

→ AI Computing

→ RTX

→ Data Center

→ Jetson

→ Robotics

→ Developer Ecosystem

Evaluate which NVIDIA capabilities are relevant to Electronic Engineering Technology, Embedded Systems, Robotics, and AI.

### Agent / Skill Exploration

Actively explore useful Agents, Skills, Plugins, and Tools through small experiments.

The goal is to understand the ecosystem before deciding what belongs in the permanent AI Studio.

### Personal AI Assistant

Research the long-term possibility of an always-available personal AI capable of:

* Voice interaction
* Phone and computer control
* Tool calling
* App actions
* Cross-device workflows
* Automation
* Knowledge access
* Human approval for sensitive actions

**Current Status: OPEN RESEARCH TOPIC**