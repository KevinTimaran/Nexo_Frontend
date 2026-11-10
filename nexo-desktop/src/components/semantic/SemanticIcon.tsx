import React from "react";
import {
  Accessibility,
  Archive,
  BadgeCheck,
  Bot,
  Building2,
  Check,
  CircleDot,
  CircleHelp,
  Clock3,
  Compass,
  Cpu,
  FileCheck2,
  FlaskConical,
  Gavel,
  GraduationCap,
  HeartHandshake,
  History,
  Landmark,
  Leaf,
  Lightbulb,
  Link2,
  Map,
  Palette,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Split,
  Store,
  Target,
  TriangleAlert,
  TrendingUp,
  Upload,
  UserRound,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { SemanticIconName } from "../../theme/semanticVisuals";

const ICONS: Record<SemanticIconName, LucideIcon> = {
  accessibility: Accessibility,
  archive: Archive,
  "badge-check": BadgeCheck,
  bot: Bot,
  building: Building2,
  check: Check,
  "circle-dot": CircleDot,
  "circle-help": CircleHelp,
  clock: Clock3,
  compass: Compass,
  cpu: Cpu,
  "file-check": FileCheck2,
  flask: FlaskConical,
  gavel: Gavel,
  graduation: GraduationCap,
  "heart-handshake": HeartHandshake,
  history: History,
  landmark: Landmark,
  leaf: Leaf,
  lightbulb: Lightbulb,
  link: Link2,
  map: Map,
  palette: Palette,
  scale: Scale,
  search: Search,
  settings: Settings2,
  shield: ShieldCheck,
  sparkles: Sparkles,
  split: Split,
  store: Store,
  target: Target,
  "triangle-alert": TriangleAlert,
  "trending-up": TrendingUp,
  upload: Upload,
  user: UserRound,
  users: UsersRound,
  "x-circle": XCircle,
};

interface SemanticIconProps {
  name: SemanticIconName;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export const SemanticIcon: React.FC<SemanticIconProps> = ({ name, className = "w-3 h-3", ...props }) => {
  const Icon = ICONS[name] ?? CircleDot;
  return <Icon className={className} aria-hidden={props["aria-hidden"] ?? true} />;
};

