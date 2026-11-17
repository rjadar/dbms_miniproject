"use client";
import { useMemo } from "react";
import {ReactFlow,Background,Controls,MiniMap, type Node,type Edge,MarkerType } from "@xyflow/react";
type Props={components:any[];edges:any[];selected?:number;affected?:any[]};
export default function Graph({components,edges,selected,affected=[]}:Props) {
 const {nodes,links}=useMemo(()=>{
  const levels=new Map<number,number>(); const place=(id:number,l:number)=>{if(levels.has(id)&&levels.get(id)!<=l)return;levels.set(id,l);edges.filter(e=>Number(e.source)===id).forEach(e=>place(Number(e.target),l+1));};
  components.forEach((c,i)=>{if(!levels.has(c.id))levels.set(c.id,Math.floor(i/4));});
  components.forEach(c=>{if(c.id===selected)place(c.id,0);});
  const same=new Map<number,number>(); return {nodes:components.map((c,i)=>{const col=levels.get(c.id)??0,row=same.get(col)??0;same.set(col,row+1);const item=affected.find(x=>x.id===c.id);return {id:String(c.id),position:{x:col*255+50,y:row*115+45},data:{label:<div className="node-label"><b>{c.name}</b><small>{c.kind}{item?` · ${item.depth===1?"DIRECT":"INDIRECT"}`:""}</small></div>},className:c.id===selected?"flow-node selected":item?`flow-node ${item.depth===1?"direct":"indirect"}`:"flow-node"};}),links:edges.map((e:any)=>({id:`${e.source}-${e.target}`,source:String(e.source),target:String(e.target),markerEnd:{type:MarkerType.ArrowClosed,color:"#64748b"},style:{stroke:"#64748b",strokeWidth:1.5}}))};
 },[components,edges,selected,affected]);
 return <div className="graph-canvas"><ReactFlow nodes={nodes as Node[]} edges={links as Edge[]} fitView nodesDraggable={false} nodesConnectable={false}><Background color="#263244" gap={22}/><MiniMap nodeColor={(n)=>n.className?.includes("selected")?"#fbbf24":n.className?.includes("direct")?"#fb7185":n.className?.includes("indirect")?"#a78bfa":"#60a5fa"}/><Controls/></ReactFlow></div>;
}
