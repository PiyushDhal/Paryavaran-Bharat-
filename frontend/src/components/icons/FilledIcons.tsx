import React from "react";

export const FilledDashboard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12C2 15.655 3.966 18.847 6.85 20.655C7.458 21.037 8.243 20.812 8.625 20.204C9.008 19.596 8.783 18.811 8.175 18.428C5.973 17.049 4.5 14.673 4.5 12C4.5 7.858 7.858 4.5 12 4.5C16.142 4.5 19.5 7.858 19.5 12C19.5 14.673 18.027 17.049 15.825 18.428C15.217 18.811 14.992 19.596 15.375 20.204C15.757 20.812 16.542 21.037 17.15 20.655C20.034 18.847 22 15.655 22 12C22 6.477 17.523 2 12 2Z" />
    <path d="M12.91 10.414C12.732 10.236 12.518 10.098 12.28 10.033L10.219 4.55C10.046 4.089 9.387 4.089 9.214 4.55L7.153 10.033C6.915 10.098 6.701 10.236 6.523 10.414C6.012 10.925 5.86 11.666 6.096 12.302L8.216 17.94C8.389 18.4 9.048 18.4 9.221 17.94L11.341 12.302C11.577 11.666 11.425 10.925 10.914 10.414H12.91Z" transform="translate(1.4, 2) rotate(45 12 12)"/>
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const FilledDigitalTwin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.636 3.109C14.28 2.96 13.864 3.033 13.57 3.3L9.5 6.996V20.264L14.636 15.602C14.992 15.75 15.408 15.677 15.702 15.41L19.772 11.714V2.062L14.636 3.109Z" opacity="0.8" />
    <path d="M8.5 7.15V20.485L4.174 16.554C3.844 16.255 3.5 15.756 3.5 15.309V2.973L8.5 7.15Z" />
    <path d="M20.5 11.83V20.264C20.5 20.816 20.052 21.264 19.5 21.264C19.23 21.264 18.975 21.155 18.788 20.962L15.5 17.585V8.15L20.5 11.83Z" />
  </svg>
);

export const FilledAnalytics = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="12" width="4" height="8" rx="1" />
    <rect x="10" y="4" width="4" height="16" rx="1" />
    <rect x="16" y="8" width="4" height="12" rx="1" />
  </svg>
);

export const FilledRiskCenter = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 12.5C2.22386 12.5 2 12.2761 2 12C2 11.7239 2.22386 11.5 2.5 11.5H6.26435C6.46788 11.5 6.65416 11.6212 6.73663 11.8078L8.14081 14.985L12.5186 3.73138C12.637 3.42674 12.9818 3.28471 13.2864 3.40315C13.5132 3.49137 13.6706 3.70275 13.693 3.94883L14.7317 15.376L16.2974 11.5794C16.3986 11.3341 16.6346 11.1687 16.9 11.1517L21.5 10.8546C21.7752 10.8368 22.0135 11.0456 22.0313 11.3208C22.0491 11.5959 21.8403 11.8342 21.5652 11.8521L17.2917 12.1281L15.3503 16.8354C15.2285 17.1306 14.8806 17.2685 14.5854 17.1467C14.3644 17.0556 14.2123 16.8523 14.1856 16.6115L13.1364 7.16874L8.85919 18.1583C8.75231 18.4329 8.44856 18.5634 8.17403 18.4475C7.96207 18.358 7.8099 18.1638 7.76011 17.9405L6.11306 12.5H2.5Z" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);

export const FilledComparison = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12.5523 2 13 2.44772 13 3V4H19.5C20.0805 4 20.5286 4.50209 20.463 5.0782L19.463 13.8282C19.3809 14.5463 18.7758 15 18.0526 15H17.5C17.7761 15 18 15.2239 18 15.5C18 16.8807 16.8807 18 15.5 18C14.1193 18 13 16.8807 13 15.5C13 15.2239 13.2239 15 13.5 15H12.9474C12.2242 15 11.6191 14.5463 11.537 13.8282L10.537 5.0782C10.4714 4.50209 10.9195 4 11.5 4H12V3C12 2.44772 12.4477 2 12 2ZM6.5 18C5.11929 18 4 16.8807 4 15.5C4 15.2239 4.22386 15 4.5 15H3.94741C3.22425 15 2.61912 14.5463 2.53702 13.8282L1.53702 5.0782C1.47141 4.50209 1.91952 4 2.5 4H9.5C10.0805 4 10.5286 4.50209 10.463 5.0782L9.46298 13.8282C9.38088 14.5463 8.77575 15 8.05259 15H7.5C7.77614 15 8 15.2239 8 15.5C8 16.8807 6.88071 18 6.5 18ZM13 19V20H17C17.5523 20 18 20.4477 18 21C18 21.5523 17.5523 22 17 22H7C6.44772 22 6 21.5523 6 21C6 20.4477 6.44772 20 7 20H11V19H13Z" />
  </svg>
);

export const FilledSimulator = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6C4 5.44772 4.44772 5 5 5H10C10.5523 5 11 5.44772 11 6C11 6.55228 10.5523 7 10 7H5C4.44772 7 4 6.55228 4 6ZM14 5C13.4477 5 13 5.44772 13 6C13 6.55228 13.4477 7 14 7H19C19.5523 7 20 6.55228 20 6C20 5.44772 19.5523 5 19 5H14Z" opacity="0.5"/>
    <path d="M4 12C4 11.4477 4.44772 11 5 11H8C8.55228 11 9 11.4477 9 12C9 12.5523 8.55228 13 8 13H5C4.44772 13 4 12.5523 4 12ZM12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H12Z" />
    <path d="M4 18C4 17.4477 4.44772 17 5 17H12C12.5523 17 13 17.4477 13 18C13 18.5523 12.5523 19 12 19H5C4.44772 19 4 18.5523 4 18ZM16 17C15.4477 17 15 17.4477 15 18C15 18.5523 15.4477 19 16 19H19C19.5523 19 20 18.5523 20 18C20 17.4477 19.5523 17 19 17H16Z" opacity="0.5"/>
    <circle cx="12.5" cy="6" r="2.5" />
    <circle cx="10.5" cy="12" r="2.5" />
    <circle cx="14.5" cy="18" r="2.5" />
  </svg>
);

export const FilledTimeline = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="18" height="15" rx="3" />
    <path d="M3 9C3 7.34315 4.34315 6 6 6H18C19.6569 6 21 7.34315 21 9V10H3V9Z" fill="#1F2937" opacity="0.3" />
    <path d="M8 3V7M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="13" width="3" height="3" rx="0.5" />
    <rect x="11" y="13" width="6" height="3" rx="0.5" />
    <rect x="7" y="17" width="10" height="2" rx="0.5" opacity="0.5" />
  </svg>
);

export const FilledCopilot = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M8 8V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <rect x="9" y="12" width="6" height="2" rx="1" fill="#0B1220"/>
  </svg>
);

export const FilledReport = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
    <path d="M14 2V8H20" fill="#1F2937" opacity="0.3"/>
    <rect x="8" y="12" width="8" height="2" rx="1" fill="#0B1220" opacity="0.5"/>
    <rect x="8" y="16" width="6" height="2" rx="1" fill="#0B1220" opacity="0.5"/>
  </svg>
);

export const FilledDataSources = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7L12 12L21 7L12 2Z" />
    <path d="M3 12L12 17L21 12M3 17L12 22L21 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8"/>
  </svg>
);

export const FilledSettings = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    <circle cx="12" cy="12" r="3" fill="#0B1220" />
  </svg>
);

export const FilledProfile = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" />
    <path d="M18.8 20C18.4 16.5 15.4 14 12 14C8.6 14 5.6 16.5 5.2 20C5.1 20.5 5.5 21 6 21H18C18.5 21 18.9 20.5 18.8 20Z" />
    <path d="M20 8H24M22 6V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
