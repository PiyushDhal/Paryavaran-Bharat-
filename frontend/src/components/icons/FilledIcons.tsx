import React from "react";

export const FilledDashboard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" fill="currentColor" fillOpacity="0.2"/>
    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12 14.5C13.3807 14.5 14.5 13.3807 14.5 12C14.5 10.6193 13.3807 9.5 12 9.5C10.6193 9.5 9.5 10.6193 9.5 12C9.5 13.3807 10.6193 14.5 12 14.5Z" fill="currentColor"/>
    <path d="M12 12L8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FilledDigitalTwin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 5.5L9.5 3L3 5.5V20.5L9.5 18L14.5 20.5L21 18V3L14.5 5.5Z" fill="currentColor" fillOpacity="0.2"/>
    <path d="M9.5 3V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.5 5.5V20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.5 5.5L9.5 3L3 5.5V20.5L9.5 18L14.5 20.5L21 18V3L14.5 5.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FilledAnalytics = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="14" width="4" height="7" rx="1.5" fill="currentColor" fillOpacity="0.3"/>
    <rect x="10" y="10" width="4" height="11" rx="1.5" fill="currentColor" />
    <rect x="17" y="4" width="4" height="17" rx="1.5" fill="currentColor" fillOpacity="0.7"/>
  </svg>
);

export const FilledRiskCenter = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" fillOpacity="0.2"/>
    <path d="M4 12H7.5L9.5 7L13.5 17L16 12H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FilledComparison = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3V21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M4 7H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M4 7L2.5 14C2.16667 16 3.5 18 6 18C8.5 18 9.83333 16 9.5 14L8 7" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 7L14.5 14C14.1667 16 15.5 18 18 18C20.5 18 21.8333 16 21.5 14L20 7" fill="currentColor" fillOpacity="0.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21H15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export const FilledSimulator = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="4" rx="2" fill="currentColor" fillOpacity="0.2"/>
    <rect x="9" y="4" width="4" height="6" rx="2" fill="currentColor"/>
    
    <rect x="3" y="15" width="18" height="4" rx="2" fill="currentColor" fillOpacity="0.2"/>
    <rect x="14" y="14" width="4" height="6" rx="2" fill="currentColor"/>
  </svg>
);

export const FilledTimeline = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="16" rx="3" fill="currentColor" fillOpacity="0.2"/>
    <path d="M3 8C3 6.34315 4.34315 5 6 5H18C19.6569 5 21 6.34315 21 8V9H3V8Z" fill="currentColor"/>
    <rect x="7" y="13" width="4" height="4" rx="1" fill="currentColor"/>
    <rect x="13" y="13" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.4"/>
  </svg>
);

export const FilledCopilot = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="16" height="12" rx="4" fill="currentColor" fillOpacity="0.2"/>
    <path d="M8 8V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="8" y="12" width="8" height="4" rx="2" fill="currentColor"/>
  </svg>
);

export const FilledReport = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2.5H6C4.89543 2.5 4 3.39543 4 4.5V19.5C4 20.6046 4.89543 21.5 6 21.5H18C19.1046 21.5 20 20.6046 20 19.5V8.5L14 2.5Z" fill="currentColor" fillOpacity="0.2"/>
    <path d="M14 2.5V8.5H20" fill="currentColor"/>
    <rect x="8" y="13" width="8" height="2" rx="1" fill="currentColor"/>
    <rect x="8" y="17" width="5" height="2" rx="1" fill="currentColor"/>
  </svg>
);

export const FilledDataSources = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="currentColor"/>
    <path d="M3 12L12 17L21 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M3 17L12 22L21 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4"/>
  </svg>
);

export const FilledSettings = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 0 1 19.79 19.71A2 2 0 0 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V21A2 2 0 0 1 12.08 23A2 2 0 0 1 10.08 21V20.91A1.65 1.65 0 0 0 9 19.4A1.65 1.65 0 0 0 7.18 19.73L7.12 19.79A2 2 0 0 1 4.29 19.79A2 2 0 0 1 4.29 16.96L4.35 16.9A1.65 1.65 0 0 0 4.68 15.08A1.65 1.65 0 0 0 3.17 14.08H3A2 2 0 0 1 1 12.08A2 2 0 0 1 3 10.08H3.09A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 4.27 7.18L4.21 7.12A2 2 0 0 1 4.21 4.29A2 2 0 0 1 7.04 4.29L7.1 4.35A1.65 1.65 0 0 0 8.92 4.68A1.65 1.65 0 0 0 9.92 3.17V3A2 2 0 0 1 11.92 1A2 2 0 0 1 13.92 3V3.09A1.65 1.65 0 0 0 15 4.6A1.65 1.65 0 0 0 16.82 4.27L16.88 4.21A2 2 0 0 1 19.71 4.21A2 2 0 0 1 19.71 7.04L19.65 7.1A1.65 1.65 0 0 0 19.32 8.92A1.65 1.65 0 0 0 20.83 9.92H21A2 2 0 0 1 23 11.92A2 2 0 0 1 21 13.92H20.91A1.65 1.65 0 0 0 19.4 15Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="4" fill="currentColor"/>
  </svg>
);

export const FilledProfile = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="8" r="4" fill="currentColor"/>
    <path d="M3 19C3 15.6863 5.68629 13 9 13C12.3137 13 15 15.6863 15 19H3Z" fill="currentColor" fillOpacity="0.3"/>
    <path d="M19 8V14M16 11H22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
