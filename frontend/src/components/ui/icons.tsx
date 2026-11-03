import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowRight,
  faChartColumn,
  faCheck,
  faClipboardList,
  faDownload,
  faFileLines,
  faKey,
  faMagnifyingGlass,
  faRightLeft,
  faTrashCan,
  faUpload,
  faUsers,
} from "@fortawesome/free-solid-svg-icons"

function Glyph({ icon, className = "glyph" }: { icon: IconDefinition; className?: string }) {
  return <FontAwesomeIcon icon={icon} className={className} />
}

export function BrandMark() {
  return <Glyph icon={faFileLines} className="brand-mark" />
}

export function PeopleIcon() {
  return <Glyph icon={faUsers} />
}

export function TrackerIcon() {
  return <Glyph icon={faClipboardList} />
}

export function UploadIcon() {
  return <Glyph icon={faUpload} />
}

export function SearchIcon() {
  return <Glyph icon={faMagnifyingGlass} />
}

export function ChartIcon() {
  return <Glyph icon={faChartColumn} />
}

export function KeyIcon() {
  return <Glyph icon={faKey} />
}

export function ArrowRightIcon() {
  return <Glyph icon={faArrowRight} />
}

export function SwapIcon() {
  return <Glyph icon={faRightLeft} />
}

export function RemoveIcon() {
  return <Glyph icon={faTrashCan} />
}

export function CheckIcon() {
  return <Glyph icon={faCheck} />
}

export function DownloadIcon() {
  return <Glyph icon={faDownload} />
}
