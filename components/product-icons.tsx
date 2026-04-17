import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function SparkLogoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 2.5L14.7 8.1L20.8 10.2L15.9 13.7L16.6 20L12 16.6L7.4 20L8.1 13.7L3.2 10.2L9.3 8.1L12 2.5Z"
        fill="url(#spark-gradient)"
      />
      <defs>
        <linearGradient id="spark-gradient" x1="4" y1="4" x2="20" y2="20">
          <stop stopColor="#5ED6FF" />
          <stop offset="0.55" stopColor="#7AB8FF" />
          <stop offset="1" stopColor="#B493FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 11.5L12 5L20 11.5" />
      <path d="M6.5 10.8V19H17.5V10.8" />
    </BaseIcon>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 7V12L15.5 14" />
      <path d="M20 12A8 8 0 1 1 17.7 6.3" />
      <path d="M20 4V8H16" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 8.8A3.2 3.2 0 1 0 12 15.2A3.2 3.2 0 1 0 12 8.8Z" />
      <path d="M4.7 13.2L3.6 12L4.7 10.8L5.6 9.1L5.1 7.5L6.8 6.8L8.1 5.4L9.9 5.9L12 4.8L14.1 5.9L15.9 5.4L17.2 6.8L18.9 7.5L18.4 9.1L19.3 10.8L20.4 12L19.3 13.2L18.4 14.9L18.9 16.5L17.2 17.2L15.9 18.6L14.1 18.1L12 19.2L9.9 18.1L8.1 18.6L6.8 17.2L5.1 16.5L5.6 14.9L4.7 13.2Z" />
    </BaseIcon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2.8L13.8 8.2L19.2 10L13.8 11.8L12 17.2L10.2 11.8L4.8 10L10.2 8.2L12 2.8Z" />
    </BaseIcon>
  );
}

export function StoryIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 5.5H17.5C18.3 5.5 19 6.2 19 7V17.5C19 18.3 18.3 19 17.5 19H6.5C5.7 19 5 18.3 5 17.5V7C5 6.2 5.2 5.5 6 5.5Z" />
      <path d="M8 9H16" />
      <path d="M8 12H16" />
      <path d="M8 15H13" />
    </BaseIcon>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.5" y="4.5" width="6" height="6" rx="1.4" />
      <rect x="13.5" y="4.5" width="6" height="6" rx="1.4" />
      <rect x="4.5" y="13.5" width="6" height="6" rx="1.4" />
      <rect x="13.5" y="13.5" width="6" height="6" rx="1.4" />
    </BaseIcon>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.5" y="6.5" width="11" height="11" rx="2" />
      <path d="M15.5 10L19.5 8V16L15.5 14" />
      <path d="M9.2 10L12.8 12L9.2 14V10Z" />
    </BaseIcon>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 18V6" />
      <path d="M7.5 10.5L12 6L16.5 10.5" />
    </BaseIcon>
  );
}

export function PlusCardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="4.5" width="14" height="15" rx="3" />
      <path d="M12 9V15" />
      <path d="M9 12H15" />
    </BaseIcon>
  );
}

export function MagicIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4.5 18.5L14.8 8.2" />
      <path d="M13 4.5L13.8 6.8L16.1 7.6L13.8 8.4L13 10.7L12.2 8.4L9.9 7.6L12.2 6.8L13 4.5Z" />
      <path d="M16.5 13.5L17 15L18.5 15.5L17 16L16.5 17.5L16 16L14.5 15.5L16 15L16.5 13.5Z" />
    </BaseIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 18l6-6-6-6" />
    </BaseIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 9l6 6 6-6" />
    </BaseIcon>
  );
}
