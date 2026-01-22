```mermaid
graph TB
    %% Agent Hierarchy - Category View

    subgraph other["📦 Other (59)"]
        _code_analyzer_[""code-analyzer""]
        _system_architect_[""system-architect""]
        browser_agent["browser-agent"]
        _ml_developer_[""ml-developer""]
        _cicd_engineer_[""cicd-engineer""]
        Performance_Monitor["Performance Monitor"]
        Resource_Allocator["Resource Allocator"]
        Topology_Optimizer["Topology Optimizer"]
        _mobile_dev_[""mobile-dev""]
        Tier["Tier"]
        Cost["Cost"]
        Haiku["Haiku"]
        Trigger["Trigger"]
        map["map"]
        Code["Code"]
        other_more[["... +39 more"]]
    end

    subgraph github["🐙 GitHub (14)"]
        code_review_swarm["code-review-swarm"]
        github_modes["github-modes"]
        issue_tracker["issue-tracker"]
        multi_repo_swarm["multi-repo-swarm"]
        pr_manager["pr-manager"]
        project_board_sync["project-board-sync"]
        release_manager["release-manager"]
        release_swarm["release-swarm"]
        repo_architect["repo-architect"]
        swarm_issue["swarm-issue"]
        swarm_pr["swarm-pr"]
        sync_coordinator["sync-coordinator"]
        workflow_automation["workflow-automation"]
    end

    subgraph coordination["👑 Coordination (11)"]
        planner[["planner"]]
        adaptive_coordinator[["adaptive-coordinator"]]
        hierarchical_coordinator[["hierarchical-coordinator"]]
        mesh_coordinator[["mesh-coordinator"]]
        collective_intelligence_coordinator[["collective-intelligence-coordinator"]]
        swarm_memory_manager[["swarm-memory-manager"]]
        Load_Balancing_Coordinator["Load Balancing Coordinator"]
        smart_agent["smart-agent"]
        swarm_init["swarm-init"]
        memory_coordinator["memory-coordinator"]
        task_orchestrator["task-orchestrator"]
    end

    subgraph performance["📈 Performance (11)"]
        performance_benchmarker["performance-benchmarker"]
        Benchmark_Suite["Benchmark Suite"]
        matrix_optimizer["matrix-optimizer"]
        pagerank_analyzer["pagerank-analyzer"]
        performance_optimizer["performance-optimizer"]
        trading_predictor["trading-predictor"]
        perf_analyzer["perf-analyzer"]
        performance_engineer["performance-engineer"]
        optimize["optimize"]
        benchmark["benchmark"]
    end

    subgraph security["🔒 Security (10)"]
        security_manager["security-manager"]
        aidefence_guardian["aidefence-guardian"]
        claims_authorizer["claims-authorizer"]
        injection_analyst["injection-analyst"]
        pii_detector["pii-detector"]
        security_architect_aidefence["security-architect-aidefence"]
        security_architect["security-architect"]
        security_auditor["security-auditor"]
        audit["audit"]
    end

    subgraph flow_nexus["🌊 Flow Nexus (9)"]
        flow_nexus_app_store["flow-nexus-app-store"]
        flow_nexus_auth["flow-nexus-auth"]
        flow_nexus_challenges["flow-nexus-challenges"]
        flow_nexus_neural["flow-nexus-neural"]
        flow_nexus_payments["flow-nexus-payments"]
        flow_nexus_sandbox["flow-nexus-sandbox"]
        flow_nexus_swarm["flow-nexus-swarm"]
        flow_nexus_user_tools["flow-nexus-user-tools"]
        flow_nexus_workflow["flow-nexus-workflow"]
    end

    subgraph development["💻 Development (8)"]
        coder["coder"]
        _backend_dev_[""backend-dev""]
        sublinear_goal_planner["sublinear-goal-planner"]
        goal_planner["goal-planner"]
        agentic_payments["agentic-payments"]
        base_template_generator["base-template-generator"]
        refactor["refactor"]
    end

    subgraph sparc["⚡ SPARC (7)"]
        sparc_orchestrator[["sparc-orchestrator"]]
        architecture["architecture"]
        pseudocode["pseudocode"]
        refinement["refinement"]
        specification["specification"]
        sparc_coder["sparc-coder"]
        sparc_coord["sparc-coord"]
    end

    subgraph testing["🧪 Testing (7)"]
        reviewer["reviewer"]
        tester["tester"]
        test_long_runner["test-long-runner"]
        production_validator["production-validator"]
        tdd_london_swarm["tdd-london-swarm"]
        testgaps["testgaps"]
    end

    subgraph consensus["🤝 Consensus (6)"]
        byzantine_coordinator[["byzantine-coordinator"]]
        gossip_coordinator[["gossip-coordinator"]]
        quorum_manager[["quorum-manager"]]
        raft_manager[["raft-manager"]]
        consensus_coordinator[["consensus-coordinator"]]
        crdt_synchronizer["crdt-synchronizer"]
    end

    subgraph v3_core["🚀 V3 Core (5)"]
        sona_learning_optimizer["sona-learning-optimizer"]
        adr_architect["adr-architect"]
        ddd_domain_expert["ddd-domain-expert"]
        reasoningbank_learner(["reasoningbank-learner"])
        v3_integration_architect["v3-integration-architect"]
    end

    subgraph memory["🧠 Memory (5)"]
        memory_specialist(["memory-specialist"])
        ultralearn["ultralearn"]
        consolidate["consolidate"]
        predict["predict"]
        preload["preload"]
    end

    subgraph analysis["🔍 Analysis (4)"]
        analyst["analyst"]
        researcher["researcher"]
        deepdive["deepdive"]
    end

    subgraph documentation["📚 Documentation (4)"]
        _api_docs_[""api-docs""]
        document["document"]
    end

    %% Delegation Relationships

    %% Skills
    skill__AgentDB_Advanced_Features_([""AgentDB Advanced Features""])
    skill__AgentDB_Learning_Plugins_([""AgentDB Learning Plugins""])
    skill__AgentDB_Memory_Patterns_([""AgentDB Memory Patterns""])
    skill__AgentDB_Performance_Optimization_([""AgentDB Performance Optimization""])
    skill__AgentDB_Vector_Search_([""AgentDB Vector Search""])
    skills_more[["... +25 more skills"]]

    %% Styling
    classDef coordinator fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef worker fill:#f3e5f5,stroke:#4a148c
    classDef reviewer fill:#fff3e0,stroke:#e65100
    classDef specialist fill:#e8f5e9,stroke:#1b5e20
    classDef skill fill:#e3f2fd,stroke:#0d47a1,stroke-dasharray: 5 5
    classDef more fill:#f5f5f5,stroke:#bdbdbd,stroke-dasharray: 3 3
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
    class skill__AgentDB_Advanced_Features_ skill
    class skill__AgentDB_Learning_Plugins_ skill
    class skill__AgentDB_Memory_Patterns_ skill
    class skill__AgentDB_Performance_Optimization_ skill
    class skill__AgentDB_Vector_Search_ skill
    class skill_browser skill
    class skill_github_code_review skill
    class skill_github_multi_repo skill
    class skill_github_project_management skill
    class skill_github_release_management skill
    class skill_github_workflow_automation skill
    class skill_Hooks_Automation skill
    class skill_Pair_Programming skill
    class skill__ReasoningBank_with_AgentDB_ skill
    class skill__ReasoningBank_Intelligence_ skill
    class skill__Skill_Builder_ skill
    class skill_sparc_methodology skill
    class skill_stream_chain skill
    class skill_swarm_advanced skill
    class skill__Swarm_Orchestration_ skill
    class skill__V3_CLI_Modernization_ skill
    class skill__V3_Core_Implementation_ skill
    class skill__V3_DDD_Architecture_ skill
    class skill__V3_Deep_Integration_ skill
    class skill__V3_MCP_Optimization_ skill
    class skill__V3_Memory_Unification_ skill
    class skill__V3_Performance_Optimization_ skill
    class skill__V3_Security_Overhaul_ skill
    class skill__V3_Swarm_Coordination_ skill
    class skill__Verification___Quality_Assurance_ skill
    class other_more more
    class github_more more
    class coordination_more more
    class performance_more more
    class security_more more
    class flow_nexus_more more
    class development_more more
    class sparc_more more
    class testing_more more
    class consensus_more more
    class v3_core_more more
    class memory_more more
    class analysis_more more
    class documentation_more more
    class skills_more more
```