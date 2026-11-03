import { useEffect } from "react"

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title === "AeroPicker" ? title : `${title} · AeroPicker`
  }, [title])
}
