import { icons, LucideProps } from "lucide-react";
import * as allIcons from "lucide-react";

export type IconKey = keyof typeof icons;

export interface IconProps extends LucideProps {
  icon: string | IconKey | undefined;
}
export function Icon({ icon, ...props }: IconProps) {
  if (icon && icon in allIcons) {
    const IconComponent = allIcons[icon as IconKey];
    return <IconComponent {...props} />;
  }
  return null;
}
