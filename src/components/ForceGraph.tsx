import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, Memory, MemoryRelation } from '../types';
import { CATEGORY_COLORS } from '../utils/constants';

interface ForceGraphProps {
  memories: Memory[];
  relations: MemoryRelation[];
  onNodeClick: (memory: Memory) => void;
  selectedNodeId?: string;
  width?: number;
  height?: number;
}

export default function ForceGraph({
  memories,
  relations,
  onNodeClick,
  selectedNodeId,
  width = 800,
  height = 600,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        setDimensions({ width: w, height: Math.max(h, 500) });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || memories.length === 0) return;

    const { width: w, height: h } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Build graph data
    const nodes: GraphNode[] = memories.map(m => ({
      id: m.id,
      content: m.content,
      category: m.category,
      importance: m.importance || 3,
      tags: m.tags,
      project_name: m.project_name,
      source: m.source,
    }));

    const nodeIds = new Set(nodes.map(n => n.id));
    const links: GraphLink[] = relations
      .filter(r => nodeIds.has(r.from_memory_id) && nodeIds.has(r.to_memory_id))
      .map(r => ({
        id: r.id,
        source: r.from_memory_id,
        target: r.to_memory_id,
        relation_type: r.relation_type,
        strength: r.strength,
      }));

    // Defs for glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const selectedFilter = defs.append('filter').attr('id', 'selected-glow');
    selectedFilter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'coloredBlur');
    const sfeMerge = selectedFilter.append('feMerge');
    sfeMerge.append('feMergeNode').attr('in', 'coloredBlur');
    sfeMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Background gradient
    const bgGrad = defs.append('radialGradient').attr('id', 'bgGrad').attr('cx', '50%').attr('cy', '50%');
    bgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1a1a2e');
    bgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0a0a12');

    svg.append('rect').attr('width', w).attr('height', h).attr('fill', 'url(#bgGrad)').attr('rx', 12);

    // Zoom behavior
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform.toString());
      });
    svg.call(zoom);

    // Link color by type
    const linkColor = (type: string) => {
      switch (type) {
        case 'contradicts': return '#ef4444';
        case 'extends': return '#8b5cf6';
        default: return '#4f46e5';
      }
    };

    // Draw links
    const link = zoomGroup.append('g').attr('class', 'links')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', d => linkColor(d.relation_type))
      .attr('stroke-opacity', d => d.strength * 0.7)
      .attr('stroke-width', d => Math.max(1, d.strength * 3))
      .attr('stroke-dasharray', d => d.relation_type === 'contradicts' ? '4,4' : null);

    // Draw nodes
    const nodeGroup = zoomGroup.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_event, d) => {
        const memory = memories.find(m => m.id === d.id);
        if (memory) onNodeClick(memory);
      });

    // Node circles
    nodeGroup.append('circle')
      .attr('r', d => 6 + (d.importance || 3) * 3)
      .attr('fill', d => {
        const color = CATEGORY_COLORS[d.category];
        return color + '33';
      })
      .attr('stroke', d => CATEGORY_COLORS[d.category])
      .attr('stroke-width', d => d.id === selectedNodeId ? 3 : 1.5)
      .attr('filter', d => d.id === selectedNodeId ? 'url(#selected-glow)' : 'url(#glow)')
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .attr('opacity', 1);

    // Inner dot
    nodeGroup.append('circle')
      .attr('r', d => 3 + (d.importance || 3))
      .attr('fill', d => CATEGORY_COLORS[d.category])
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .delay(100)
      .attr('opacity', 0.9);

    // Labels
    nodeGroup.append('text')
      .text(d => {
        const words = d.content.split(' ').slice(0, 4).join(' ');
        return words.length < d.content.length ? words + '…' : words;
      })
      .attr('dy', d => -(10 + (d.importance || 3) * 3))
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .delay(200)
      .attr('opacity', 0.8);

    // Hover effects
    nodeGroup
      .on('mouseenter', function (_, d) {
        d3.select(this).select('circle:first-child')
          .transition().duration(150)
          .attr('r', 6 + (d.importance || 3) * 3 + 4)
          .attr('stroke-width', 2.5);
        d3.select(this).select('text')
          .transition().duration(150)
          .attr('opacity', 1)
          .attr('fill', '#ffffff');
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).select('circle:first-child')
          .transition().duration(150)
          .attr('r', 6 + (d.importance || 3) * 3)
          .attr('stroke-width', d.id === selectedNodeId ? 3 : 1.5);
        d3.select(this).select('text')
          .transition().duration(150)
          .attr('opacity', 0.8)
          .attr('fill', '#e2e8f0');
      });

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => 120 - (d.strength || 0.5) * 40)
        .strength(d => d.strength || 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => 14 + (d.importance || 3) * 3));

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      nodeGroup.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [memories, relations, dimensions, selectedNodeId, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px]">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full rounded-xl"
      />
    </div>
  );
}
