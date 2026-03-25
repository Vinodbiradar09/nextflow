import { WorkflowNode, WorkflowEdge, NodeType } from "@prisma/client";

export type DAGNode = {
  rfNodeId: string;
  type: NodeType;
  // rfNodeIds of nodes that must complete before this node can run
  dependencies: string[];
  // rfNodeIds of nodes that depend on this node's output
  dependents: string[];
};

export type DAGGraph = Map<string, DAGNode>;

export function buildDAG(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): DAGGraph {
  const graph: DAGGraph = new Map();
  // initialize every node in the graph with empty dependency lists
  for (const node of nodes) {
    graph.set(node.rfNodeId, {
      rfNodeId: node.rfNodeId,
      type: node.type,
      dependencies: [],
      dependents: [],
    });
  }
  // populate dependencies and dependents from edges
  // edge: source → target means target depends on source
  for (const edge of edges) {
    const sourceNode = graph.get(edge.sourceRfNodeId);
    const targetNode = graph.get(edge.targetRfNodeId);
    // skip edges that reference nodes not in the graph
    // this can happen in partial runs where only some nodes are included
    if (!sourceNode || !targetNode) continue;
    // target depends on source
    if (!targetNode.dependencies.includes(edge.sourceRfNodeId)) {
      targetNode.dependencies.push(edge.sourceRfNodeId);
    }
    // source has target as a dependent
    if (!sourceNode.dependents.includes(edge.targetRfNodeId)) {
      sourceNode.dependents.push(edge.targetRfNodeId);
    }
  }
  return graph;
}

export function topologicalSort(graph: DAGGraph): string[] {
  const inDegree = new Map<string, number>();
  const sorted: string[] = [];
  const queue: string[] = [];
  for (const [rfNodeId, node] of graph) {
    inDegree.set(rfNodeId, node.dependencies.length);
    if (node.dependencies.length === 0) {
      queue.push(rfNodeId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    const currentNode = graph.get(current)!;
    // for each node that depends on current, reduce its in-degree
    for (const dependentId of currentNode.dependents) {
      const degree = (inDegree.get(dependentId) ?? 0) - 1;
      inDegree.set(dependentId, degree);

      // if all dependencies are resolved, this node is ready to run
      if (degree === 0) {
        queue.push(dependentId);
      }
    }
  }
  // if sorted doesn't contain all nodes, a cycle exists
  if (sorted.length !== graph.size) {
    throw new Error(
      "cycle detected in workflow graph. Workflow must be a DAG.",
    );
  }
  return sorted;
}

// scope filtering

export function filterDAGToScope(
  graph: DAGGraph,
  scopeNodeIds: string[],
): DAGGraph {
  const scopeSet = new Set(scopeNodeIds);
  const filtered: DAGGraph = new Map();

  for (const [rfNodeId, node] of graph) {
    if (!scopeSet.has(rfNodeId)) continue;
    filtered.set(rfNodeId, {
      rfNodeId: node.rfNodeId,
      type: node.type,
      // only keep dependencies that are also in scope
      dependencies: node.dependencies.filter((dep) => scopeSet.has(dep)),
      dependents: node.dependents.filter((dep) => scopeSet.has(dep)),
    });
  }
  return filtered;
}

// execution waves
// groups nodes into "waves" — nodes in the same wave can run in parallel
// wave 0 = no dependencies (run first)
// wave 1 = depends only on wave 0 nodes (run after wave 0 completes)
// and so on

export function buildExecutionWaves(graph: DAGGraph): string[][] {
  const sorted = topologicalSort(graph);
  const nodeWave = new Map<string, number>();
  const waves: string[][] = [];
  for (const rfNodeId of sorted) {
    const node = graph.get(rfNodeId)!;
    // wave = 1 + max wave of all dependencies
    // if no dependencies, wave = 0
    const wave =
      node.dependencies.length === 0
        ? 0
        : Math.max(...node.dependencies.map((dep) => nodeWave.get(dep) ?? 0)) +
          1;
    nodeWave.set(rfNodeId, wave);
    if (!waves[wave]) waves[wave] = [];
    waves[wave].push(rfNodeId);
  }
  return waves;
}

// validation
export function validateDAG(
  graph: DAGGraph,
): { valid: true } | { valid: false; reason: string } {
  try {
    topologicalSort(graph);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason:
        error instanceof Error ? error.message : "Invalid workflow graph.",
    };
  }
}
