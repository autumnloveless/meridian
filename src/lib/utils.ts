import type { Dispatch, KeyboardEvent, SetStateAction } from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const handleTextareaTabKey = (
  event: KeyboardEvent<HTMLTextAreaElement>,
  setValue: Dispatch<SetStateAction<string>>,
  tabText = "    ",
) => {
  if (
    event.key !== "Tab" ||
    event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return
  }

  event.preventDefault()

  const target = event.currentTarget
  const { selectionEnd, selectionStart, value } = target
  const nextValue = `${value.slice(0, selectionStart)}${tabText}${value.slice(selectionEnd)}`
  const nextCaretPosition = selectionStart + tabText.length

  setValue(nextValue)

  window.requestAnimationFrame(() => {
    target.setSelectionRange(nextCaretPosition, nextCaretPosition)
  })
}

export const getInitials = (name: string) => {
  const parts = name.split(" ").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};