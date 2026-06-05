interface Props {
  drawerName: string
}

export function SelectingWordOverlay({ drawerName }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-md backdrop-blur-sm">
      <div className="text-center space-y-3">
        <p className="text-4xl">🎨</p>
        <p className="text-lg font-semibold">
          <span className="text-primary">{drawerName}</span> is choosing a word
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
