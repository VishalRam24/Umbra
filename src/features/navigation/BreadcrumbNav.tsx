import React from "react";
import UmbraLogo from "@/features/home/UmbraLogo";
import { useBoardStore } from "@/store/useBoardStore";

export default function BreadcrumbNav() {
  const activeWorkspaceId = useBoardStore((s) => s.activeWorkspaceId);
  const currentBoardId = useBoardStore((s) => s.currentBoardId);
  const getCurrentBoardName = useBoardStore((s) => s.getCurrentBoardName);
  const goBack = useBoardStore((s) => s.goBack);
  const goHome = useBoardStore((s) => s.goHome);
  const boardStack = useBoardStore((s) => s.boardStack);
  const elements = useBoardStore((s) => s.elements);
  const workspaces = useBoardStore((s) => s.workspaces);

  const isAtWorkspaceRoot =
    !!activeWorkspaceId && currentBoardId === activeWorkspaceId;

  // Build breadcrumb trail: workspace name > board1 > board2 > current
  const workspaceName = activeWorkspaceId
    ? workspaces[activeWorkspaceId]?.name || "Canvas"
    : "";

  const stackNames = boardStack.map(
    (id) => elements[id]?.content || "Board",
  );

  const currentName = getCurrentBoardName();

  return (
    <>
      {/* Top bar: logo + canvas name */}
      <div
        data-canvas-chrome="true"
        className="absolute top-0 left-0 right-0 z-50 flex items-center px-3 h-14 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(18,18,20,0.9) 0%, transparent 100%)" }}
      >
        {/* Logo */}
        <button
          type="button"
          onClick={goHome}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1e2026]/95 backdrop-blur-md border border-white/[0.08] shadow-2xl text-white/50 hover:text-white/90 hover:bg-[#282a32]/95 active:scale-95 transition-all pointer-events-auto shrink-0"
          title="Home"
        >
          <UmbraLogo size={20} />
        </button>

        {/* Canvas name + breadcrumb */}
        <div className="flex items-center gap-2 pointer-events-auto ml-3">
          {/* Back arrow when inside a nested board */}
          {!isAtWorkspaceRoot && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center justify-center w-7 h-7 rounded-md text-white/40 hover:text-white/75 hover:bg-white/[0.06] transition-colors"
              title="Back"
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
          )}

          {/* Breadcrumb trail */}
          <div className="flex items-center gap-1 text-[14px]">
            {!isAtWorkspaceRoot && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    for (let i = boardStack.length; i > 0; i--) goBack();
                  }}
                  className="text-white/30 hover:text-white/60 transition-colors truncate max-w-[120px]"
                >
                  {workspaceName}
                </button>

                {stackNames.map((name, i) => (
                  <React.Fragment key={i}>
                    <span className="text-white/15 mx-0.5">/</span>
                    <span className="text-white/25 truncate max-w-[100px]">{name}</span>
                  </React.Fragment>
                ))}

                <span className="text-white/15 mx-0.5">/</span>
              </>
            )}

            {/* Current board name — prominent */}
            {currentBoardId && (
              <span className="text-[28px] text-white/95 font-bold truncate max-w-[400px] leading-none">
                {currentName}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
