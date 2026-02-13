"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LiveWaveform } from "@/components/ui/live-waveform"

export type VoiceButtonState =
  | "idle"
  | "recording"
  | "processing"
  | "success"
  | "error"

export interface VoiceButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onError"> {
  /**
   * Current state of the voice button
   * @default "idle"
   */
  state?: VoiceButtonState

  /**
   * Callback when button is clicked
   */
  onPress?: () => void

  /**
   * Content to display on the left side (label)
   * Can be a string or ReactNode for custom components
   */
  label?: React.ReactNode

  /**
   * Content to display on the right side (e.g., keyboard shortcut)
   * Can be a string or ReactNode for custom components
   * @example "⌥Space" or <kbd>⌘K</kbd>
   */
  trailing?: React.ReactNode

  /**
   * Icon to display in the center when idle (for icon size buttons)
   */
  icon?: React.ReactNode

  /**
   * Custom variant for the button
   * @default "outline"
   */
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"

  /**
   * Size of the button
   * @default "default"
   */
  size?: "default" | "sm" | "lg" | "icon"

  /**
   * Custom className for the button
   */
  className?: string

  /**
   * Custom className for the waveform container
   */
  waveformClassName?: string

  /**
   * Waveform update rate in ms (~16 for 60fps)
   * @default 30
   */
  waveformUpdateRate?: number

  /**
   * Duration in ms to show success/error states
   * @default 1500
   */
  feedbackDuration?: number

  /**
   * Disable the button
   */
  disabled?: boolean
}

const VoiceButtonInner = React.forwardRef<HTMLButtonElement, VoiceButtonProps>(
  (
    {
      state = "idle",
      onPress,
      label,
      trailing,
      icon,
      variant = "outline",
      size = "default",
      className,
      waveformClassName,
      waveformUpdateRate,
      feedbackDuration = 1500,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [showFeedback, setShowFeedback] = React.useState(false)

    React.useEffect(() => {
      if (state === "success" || state === "error") {
        setShowFeedback(true)
        const timeout = setTimeout(
          () => setShowFeedback(false),
          feedbackDuration
        )
        return () => clearTimeout(timeout)
      } else {
        // Reset feedback when state changes away from success/error
        setShowFeedback(false)
      }
    }, [state, feedbackDuration])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      onPress?.()
    }

    const isRecording = state === "recording"
    const isProcessing = state === "processing"
    const _isSuccess = state === "success"
    void _isSuccess
    const isError = state === "error"

    const buttonVariant = variant
    const isDisabled = disabled || isProcessing

    const displayLabel = label

    const shouldShowWaveform = isRecording || isProcessing || showFeedback
    const shouldShowTrailing = !shouldShowWaveform && trailing

    const ariaLabel =
      state === "recording"
        ? "Recording…"
        : state === "processing"
          ? "Processing…"
          : state === "success"
            ? "Voice input ready"
            : state === "error"
              ? "Voice input failed"
              : "Start voice input"

    return (
      <Button
        ref={ref}
        type="button"
        variant={buttonVariant}
        size={size}
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "gap-2 transition-all duration-200",
          size === "icon" && "relative",
          className
        )}
        aria-label={ariaLabel}
        aria-live="polite"
        {...props}
      >
        {size !== "icon" && displayLabel && (
          <span className="inline-flex shrink-0 items-center justify-start">
            {displayLabel}
          </span>
        )}

        <div
          className={cn(
            "relative box-content flex shrink-0 items-center justify-center overflow-hidden transition-all duration-300",
            size === "icon"
              ? "absolute inset-0 rounded-sm border-0 bg-transparent"
              : "h-5 w-24 rounded-sm border",
            size !== "icon" && "border-border bg-muted/50",
            waveformClassName
          )}
        >
          {!isProcessing && (
            <LiveWaveform
              active={isRecording}
              processing={false}
              barWidth={1.2}
              barGap={1.2}
              barRadius={2}
              fadeEdges={false}
              sensitivity={1.5}
              smoothingTimeConstant={0.85}
              height={18}
              mode="static"
              updateRate={waveformUpdateRate ?? 30}
              className="animate-in fade-in absolute inset-0 flex items-center justify-center duration-300 ease-out waveform-bar"
            />
          )}
          
          {isProcessing && (
            <div className="animate-in fade-in absolute inset-0 flex items-center justify-center duration-300">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer rounded-full" />
            </div>
          )}

          {shouldShowTrailing && (
            <div className="animate-in fade-in absolute inset-0 flex items-center justify-center duration-300">
              {typeof trailing === "string" ? (
                <span className="text-muted-foreground px-1.5 font-mono text-[10px] font-medium select-none">
                  {trailing}
                </span>
              ) : (
                trailing
              )}
            </div>
          )}

          {!shouldShowWaveform &&
            !shouldShowTrailing &&
            icon &&
            size === "icon" && (
              <div className="animate-in fade-in absolute inset-0 flex items-center justify-center duration-300">
                {icon}
              </div>
            )}


          {/* Error Icon */}
          {isError && showFeedback && (
            <div className="animate-in fade-in bg-background/80 absolute inset-0 flex items-center justify-center duration-300">
              <span className="text-destructive text-[10px] font-medium">
                <XIcon className="size-3.5" />
              </span>
            </div>
          )}
        </div>
      </Button>
    )
  }
)

VoiceButtonInner.displayName = "VoiceButton"

export const VoiceButton = React.memo(VoiceButtonInner)
