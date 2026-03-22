
export enum AgentType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export interface Agent {
  id: string;
  retell_agent_id: string;
  agent_nickname: string;
  agent_type: AgentType;
  agent_phone?: string;
  created_at: string;
  user_id: string;
  owner_info?: string;
  is_admin?: boolean;
}

export interface StarProps {
  x: number;
  y: number;
  size: number;
  opacity: number;
}
