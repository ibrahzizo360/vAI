import { Badge, BadgeProps } from "@/components/ui/badge"

interface NoteTypeBadgeProps extends BadgeProps {
  type: string;
}

export function NoteTypeBadge({ type, ...props }: NoteTypeBadgeProps) {
  const typeConfig = {
    rounds: {
      label: "Ward Round",
      className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
    },
    consult: {
      label: "Consult",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    family_meeting: {
      label: "Family Meeting",
      className: "bg-green-100 text-green-800 hover:bg-green-100",
    },
    procedure: {
      label: "Procedure",
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
    discharge: {
      label: "Discharge",
      className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
    },
    emergency: {
      label: "Emergency",
      className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
    },
  };

  const config = typeConfig[type as keyof typeof typeConfig] || {
    label: type,
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  };

  return (
    <Badge className={config.className} {...props}>
      {config.label}
    </Badge>
  );
}