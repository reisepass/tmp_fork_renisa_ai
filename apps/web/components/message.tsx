import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import type { ComponentProps, HTMLAttributes } from "react";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full items-end justify-end gap-2 py-4",
      from === "user" ? "is-user" : "is-assistant flex-row-reverse justify-end",
      "[&>div]:max-w-[80%]",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "flex flex-col gap-2 overflow-hidden font-[family-name:var(--font-outfit)] text-[16px] leading-[1.5]",
      "group-[.is-user]:bg-white group-[.is-user]:text-[#17191c] group-[.is-user]:p-[12px] group-[.is-user]:rounded-tl-[16px] group-[.is-user]:rounded-tr-[16px] group-[.is-user]:rounded-bl-[16px] group-[.is-user]:rounded-br-[4px] group-[.is-user]:max-w-[270px] group-[.is-user]:font-medium group-[.is-user]:[&_*]:!text-[#17191c]",
      "group-[.is-assistant]:bg-transparent group-[.is-assistant]:text-[#17191c] group-[.is-assistant]:pr-[24px] group-[.is-assistant]:pt-[8px] group-[.is-assistant]:w-full group-[.is-assistant]:max-w-full",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn("size-8 ring-1 ring-border bg-white", className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0 p-1.5" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || "ME"}</AvatarFallback>
  </Avatar>
);
