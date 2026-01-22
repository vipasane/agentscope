```mermaid
flowchart LR
    %% Agent Dataflow

    subgraph Input["Input Layer"]
        USER[("User")]
        PROMPT["Prompt"]
    end

    subgraph Hooks["Hook Layer"]
        hook_PreToolUse["🔒 PreToolUse"]
        hook_PostToolUse["✅ PostToolUse"]
        hook_UserPromptSubmit["📝 UserPromptSubmit"]
        hook_Notification["🔔 Notification"]
        hook_Stop["🛑 Stop"]
    end

    subgraph Processing["Processing Layer"]
        subgraph Coordinators["Coordinators"]
            byzantine_coordinator["byzantine-coordinator"]
            gossip_coordinator["gossip-coordinator"]
            quorum_manager["quorum-manager"]
            raft_manager["raft-manager"]
            planner["planner"]
            consensus_coordinator["consensus-coordinator"]
            adaptive_coordinator["adaptive-coordinator"]
            hierarchical_coordinator["hierarchical-coordinator"]
            mesh_coordinator["mesh-coordinator"]
            collective_intelligence_coordinator["collective-intelligence-coordinator"]
            sparc_orchestrator["sparc-orchestrator"]
            swarm_memory_manager["swarm-memory-manager"]
        end
        subgraph Workers["Workers"]
            browser_agent["browser-agent"]
            test_long_runner["test-long-runner"]
            flow_nexus_app_store["flow-nexus-app-store"]
            flow_nexus_auth["flow-nexus-auth"]
            flow_nexus_challenges["flow-nexus-challenges"]
            flow_nexus_neural["flow-nexus-neural"]
            flow_nexus_payments["flow-nexus-payments"]
            flow_nexus_sandbox["flow-nexus-sandbox"]
            flow_nexus_swarm["flow-nexus-swarm"]
            flow_nexus_user_tools["flow-nexus-user-tools"]
            flow_nexus_workflow["flow-nexus-workflow"]
            sublinear_goal_planner["sublinear-goal-planner"]
            goal_planner["goal-planner"]
            agentic_payments["agentic-payments"]
            matrix_optimizer["matrix-optimizer"]
            pagerank_analyzer["pagerank-analyzer"]
            performance_optimizer["performance-optimizer"]
            trading_predictor["trading-predictor"]
            base_template_generator["base-template-generator"]
            Tier["Tier"]
            Cost["Cost"]
            Haiku["Haiku"]
            Trigger["Trigger"]
            optimize["optimize"]
            testgaps["testgaps"]
            audit["audit"]
            document["document"]
            map["map"]
            deepdive["deepdive"]
            Code["Code"]
            Command["Command"]
            init["init"]
            swarm["swarm"]
            memory["memory"]
            mcp["mcp"]
            task["task"]
            session["session"]
            config["config"]
            status["status"]
            workflow["workflow"]
            hooks["hooks"]
            Command["Command"]
            daemon["daemon"]
            neural["neural"]
            security["security"]
            performance["performance"]
            providers["providers"]
            plugins["plugins"]
            deployment["deployment"]
            embeddings["embeddings"]
            claims["claims"]
            migrate["migrate"]
            doctor["doctor"]
            completions["completions"]
            Hook["Hook"]
            route["route"]
            explain["explain"]
            pretrain["pretrain"]
            metrics["metrics"]
            transfer["transfer"]
            list["list"]
            intelligence["intelligence"]
            worker["worker"]
            progress["progress"]
            statusline["statusline"]
            Worker["Worker"]
            ultralearn["ultralearn"]
            optimize["optimize"]
            consolidate["consolidate"]
            predict["predict"]
            audit["audit"]
            map["map"]
            preload["preload"]
            deepdive["deepdive"]
            document["document"]
            refactor["refactor"]
            benchmark["benchmark"]
            testgaps["testgaps"]
            Metric["Metric"]
            Condition["Condition"]
        end
        subgraph Specialists["Specialists"]
            memory_specialist["memory-specialist"]
            reasoningbank_learner["reasoningbank-learner"]
        end
    end

    subgraph External["External Services (MCP)"]
        mcp_claude_flow[("💾 claude-flow")]
    end

    subgraph Output["Output Layer"]
        RESPONSE["Response"]
        ARTIFACTS["Artifacts"]
    end

    %% Data Flow
    USER --> PROMPT
    PROMPT --> hook_UserPromptSubmit
    hook_UserPromptSubmit --> Processing
    Processing <--> hook_PreToolUse
    Processing --> hook_PostToolUse
    Processing --> RESPONSE
    Processing --> ARTIFACTS

    %% Styling
    classDef input fill:#bbdefb,stroke:#1976d2
    classDef hook fill:#fff9c4,stroke:#f9a825
    classDef coordinator fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef worker fill:#f3e5f5,stroke:#4a148c
    classDef reviewer fill:#fff3e0,stroke:#e65100
    classDef specialist fill:#e8f5e9,stroke:#1b5e20
    classDef mcp fill:#fce4ec,stroke:#880e4f
    classDef output fill:#c8e6c9,stroke:#388e3c
    class USER,PROMPT input
    class RESPONSE,ARTIFACTS output
    class hook_PreToolUse hook
    class hook_PostToolUse hook
    class hook_UserPromptSubmit hook
    class hook_Notification hook
    class hook_Stop hook
    class _code_analyzer_ "analysis"
    class analyst code-analyzer
    class _code_analyzer_ "analysis"
    class _system_architect_ "architecture"
    class _system_architect_ "architecture"
    class browser_agent worker
    class byzantine_coordinator coordinator
    class crdt_synchronizer synchronizer
    class gossip_coordinator coordinator
    class performance_benchmarker analyst
    class quorum_manager coordinator
    class raft_manager coordinator
    class security_manager security
    class coder developer
    class planner coordinator
    class researcher analyst
    class reviewer validator
    class tester validator
    class test_long_runner worker
    class _ml_developer_ "data"
    class _ml_developer_ "data"
    class _backend_dev_ "development"
    class _backend_dev_ "development"
    class _cicd_engineer_ "devops"
    class _cicd_engineer_ "devops"
    class _api_docs_ "documentation"
    class _api_docs_ "documentation"
    class flow_nexus_app_store worker
    class flow_nexus_auth worker
    class flow_nexus_challenges worker
    class flow_nexus_neural worker
    class flow_nexus_payments worker
    class flow_nexus_sandbox worker
    class flow_nexus_swarm worker
    class flow_nexus_user_tools worker
    class flow_nexus_workflow worker
    class code_review_swarm development
    class github_modes development
    class issue_tracker development
    class multi_repo_swarm coordination
    class pr_manager development
    class project_board_sync coordination
    class release_manager development
    class release_swarm coordination
    class repo_architect architecture
    class swarm_issue coordination
    class swarm_pr development
    class sync_coordinator coordination
    class workflow_automation automation
    class sublinear_goal_planner worker
    class goal_planner worker
    class Benchmark_Suite agent
    class Load_Balancing_Coordinator agent
    class Performance_Monitor agent
    class Resource_Allocator agent
    class Topology_Optimizer agent
    class agentic_payments worker
    class sona_learning_optimizer adaptive-learning
    class architecture architect
    class pseudocode architect
    class refinement developer
    class specification analyst
    class _mobile_dev_ "specialized"
    class _mobile_dev_ "specialized"
    class consensus_coordinator coordinator
    class matrix_optimizer worker
    class pagerank_analyzer worker
    class performance_optimizer worker
    class trading_predictor worker
    class adaptive_coordinator coordinator
    class hierarchical_coordinator coordinator
    class mesh_coordinator coordinator
    class smart_agent automation
    class base_template_generator worker
    class swarm_init coordination
    class pr_manager development
    class sparc_coder development
    class memory_coordinator coordination
    class task_orchestrator orchestration
    class perf_analyzer analysis
    class sparc_coord coordination
    class production_validator validator
    class tdd_london_swarm tester
    class adr_architect architect
    class aidefence_guardian security
    class claims_authorizer security
    class collective_intelligence_coordinator coordinator
    class ddd_domain_expert architect
    class injection_analyst security
    class memory_specialist specialist
    class performance_engineer optimization
    class pii_detector security
    class reasoningbank_learner specialist
    class security_architect_aidefence security
    class security_architect security
    class security_auditor security
    class sparc_orchestrator coordinator
    class swarm_memory_manager coordinator
    class v3_integration_architect architect
    class Tier worker
    class Cost worker
    class Haiku worker
    class Trigger worker
    class optimize worker
    class testgaps worker
    class audit worker
    class document worker
    class map worker
    class deepdive worker
    class Code worker
    class Command worker
    class init worker
    class swarm worker
    class memory worker
    class mcp worker
    class task worker
    class session worker
    class config worker
    class status worker
    class workflow worker
    class hooks worker
    class Command worker
    class daemon worker
    class neural worker
    class security worker
    class performance worker
    class providers worker
    class plugins worker
    class deployment worker
    class embeddings worker
    class claims worker
    class migrate worker
    class doctor worker
    class completions worker
    class Hook worker
    class route worker
    class explain worker
    class pretrain worker
    class metrics worker
    class transfer worker
    class list worker
    class intelligence worker
    class worker worker
    class progress worker
    class statusline worker
    class Worker worker
    class ultralearn worker
    class optimize worker
    class consolidate worker
    class predict worker
    class audit worker
    class map worker
    class preload worker
    class deepdive worker
    class document worker
    class refactor worker
    class benchmark worker
    class testgaps worker
    class Metric worker
    class Condition worker
    class mcp_claude_flow mcp
```