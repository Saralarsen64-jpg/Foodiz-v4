import { useState } from "react";
import { Info, X } from "lucide-react";

export default function InfoHint({ label = "Informations", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <span className="relative inline-flex align-middle">
    <button type="button" aria-label={label} onClick={() => setOpen((value) => !value)} className="weello-info-trigger"><Info size={14} /></button>
    {open && <span role="dialog" className="weello-info-popover"><button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="absolute right-2 top-2 text-weello-gold"><X size={13}/></button><span className="block pr-5">{children}</span></span>}
  </span>;
}
