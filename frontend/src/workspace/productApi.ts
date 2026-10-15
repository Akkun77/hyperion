import { API_BASE } from '../api'
import type { APITrafficEvent } from '../types'
import type { ExecutionFlowResponse } from '../types'
export interface ConnectionDraft {kind:'manual'|'openapi'|'demo';name:string;base_url:string;routes:{method:string;path:string}[];specification?:Record<string,unknown>;authorized:boolean}
export interface ConnectionRecord {id:number;name:string;kind:string;base_url:string;status:string;observed_requests:number;capture_method:string;message:string;routes:{method:string;path:string}[];created_at:string;last_observed_at?:string|null}
export interface ConnectionValidation {valid:boolean;routes:{method:string;path:string}[];capture_options:string[];limitations:string;base_url:string}
export interface DemoResult {run_id:string;scenario:string;source:string;execution:string;presentation:string;request_count:number;event_ids:number[];response_statuses:number[];selected_request:APITrafficEvent;findings:{alert_id:string;alert_type:string;severity:string;description:string;related_event_id:number}[];detector_result:string;flow:ExecutionFlowResponse}
export interface ActivitySummary {
 total_requests:number;unique_endpoints:number;bucket_seconds:number;evaluated_at:string
 series:{timestamp:string;count:number}[];groups:{label:string;count:number}[]
 most_active:{method:string;endpoint:string;count:number}[];responses:{status_code:number;count:number}[]
 findings:{detector:string;count:number}[];recent:APITrafficEvent[]
}
export interface RequestPage {total:number;page:number;page_size:number;items:APITrafficEvent[]}
export async function productRequest<T>(path:string,signal?:AbortSignal,body?:unknown):Promise<T> {
 const response=await fetch(`${API_BASE}/api/governance/${path}`,{signal,...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})})
 const data=await response.json().catch(()=>null)
 if(!response.ok) throw new Error(typeof data?.detail==='string'?data.detail:`Backend request failed (${response.status}).`)
 return data as T
}
