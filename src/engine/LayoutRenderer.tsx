import type { ReactElement, ReactNode } from "react";
import { Centered } from "../layouts/Centered";
import { Floating } from "../layouts/Floating";
import { FullScreen } from "../layouts/FullScreen";

export type SingleChildLayoutType = "full-screen" | "centered" | "floating";

export function renderLayout(type: SingleChildLayoutType | undefined, children: ReactNode): ReactElement {
  switch (type) {
    case "centered":
      return <Centered>{children}</Centered>;
    case "floating":
      return <Floating>{children}</Floating>;
    case "full-screen":
    default:
      return <FullScreen>{children}</FullScreen>;
  }
}
