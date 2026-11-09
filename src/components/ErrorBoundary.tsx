import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-foreground">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold">
            {this.props.fallbackTitle || "Something went wrong rendering this view"}
          </h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground font-mono">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="mt-4 gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" />
            <span>Try Reloading View</span>
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
