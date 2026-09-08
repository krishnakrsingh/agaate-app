"use client";
import { formatDate } from "@/lib/business";
import { Icons } from "@/components/icons";

export type PrintableTask = {
  id: string;
  dateStr: string;
  plotName: string;
  cropName?: string;
  category: string;
  title: string;
  instructions: string;
  priority: string;
  officerName: string;
};

export function PrintableSpraySheet({
  farmName,
  location,
  weekRange,
  tasks,
  onClose,
}: {
  farmName: string;
  location: string;
  weekRange: string;
  tasks: PrintableTask[];
  onClose: () => void;
}) {
  const sprayAndFertTasks = tasks.filter((t) =>
    ["SPRAYING", "PREVENTIVE_SPRAY", "FERTIGATION", "FOLIAR_NUTRITION", "IRRIGATION_RECOMMENDATION"].includes(t.category) ||
    t.title.toLowerCase().includes("spray") ||
    t.title.toLowerCase().includes("drip") ||
    t.title.toLowerCase().includes("fertilizer")
  );

  const displayTasks = sprayAndFertTasks.length > 0 ? sprayAndFertTasks : tasks;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-zinc-900 rounded-xl max-w-4xl w-full p-6 shadow-2xl space-y-5 print:shadow-none print:max-w-none print:p-4 print:w-full print:rounded-none">
        
        {/* Screen Top Bar Controls (Hidden on Print) */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Icons.FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-zinc-900">Shed Chemical & Spray Chart</h3>
              <p className="text-xs text-zinc-500">Printable physical sheet for the mixing bay & chemical storage shed.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Icons.Check className="w-3.5 h-3.5" />
              Print Physical Sheet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs px-3 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>

        {/* ── PRINTABLE DOCUMENT CONTENT ── */}
        <div className="space-y-4 text-xs">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-3">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                AGAATE PRECISION AGRONOMY &bull; CHEMICAL &amp; SPRAY RECORD
              </div>
              <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase mt-0.5">
                {farmName} — Weekly Field Spray Chart
              </h1>
              <p className="text-xs text-zinc-600">
                Estate Location: <strong>{location}</strong> &bull; Schedule Period: <strong>{weekRange}</strong>
              </p>
            </div>
            <div className="text-right text-[11px] text-zinc-700">
              <div>Notice: <strong>Mandatory PPE Enforced</strong></div>
              <div>Emergency Poison Control: <strong>1800-116-117</strong></div>
              <div className="text-[10px] text-zinc-500 mt-1">Generated via Agaate Crop Doctor</div>
            </div>
          </div>

          {/* Safety Notice Banner */}
          <div className="bg-amber-50 border border-amber-300 rounded p-2.5 text-[11px] text-amber-950 flex items-start gap-2">
            <div className="font-bold whitespace-nowrap">⚠️ SAFETY MANDATE:</div>
            <div>
              Mix all agro-chemicals in open ventilated bay. Triple-rinse empty chemical containers. Strictly wear
              respirator mask, chemical-resistant nitrile gloves, and eye goggles during entire mixing and application cycle.
            </div>
          </div>

          {/* Prescriptions Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-400 text-left">
              <thead>
                <tr className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-wider">
                  <th className="border border-zinc-400 p-2 w-24">Date</th>
                  <th className="border border-zinc-400 p-2 w-28">Plot / Crop</th>
                  <th className="border border-zinc-400 p-2">Operation & Instructions</th>
                  <th className="border border-zinc-400 p-2 w-24">Category</th>
                  <th className="border border-zinc-400 p-2 w-28">Supervisor</th>
                  <th className="border border-zinc-400 p-2 w-32">Operator Sign-Off</th>
                </tr>
              </thead>
              <tbody>
                {displayTasks.map((t, idx) => (
                  <tr key={t.id} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                    <td className="border border-zinc-400 p-2 font-mono font-bold align-top whitespace-nowrap">
                      {t.dateStr}
                    </td>
                    <td className="border border-zinc-400 p-2 align-top">
                      <div className="font-bold text-zinc-900">{t.plotName}</div>
                      <div className="text-[11px] text-zinc-600">{t.cropName || "Active Parcel"}</div>
                    </td>
                    <td className="border border-zinc-400 p-2 align-top space-y-1">
                      <div className="font-bold text-zinc-900">{t.title}</div>
                      <div className="text-zinc-700 leading-snug">{t.instructions}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        PPE: [ ] Mask &bull; [ ] Gloves &bull; [ ] Goggles &bull; [ ] Boots
                      </div>
                    </td>
                    <td className="border border-zinc-400 p-2 align-top">
                      <span className="font-semibold text-zinc-800 text-[10px] uppercase">
                        {t.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="border border-zinc-400 p-2 align-top text-zinc-800 whitespace-nowrap">
                      {t.officerName}
                    </td>
                    <td className="border border-zinc-400 p-2 align-top text-zinc-500">
                      <div className="text-[9px] text-zinc-400 mb-4">Date &amp; Time Applied:</div>
                      <div className="border-b border-zinc-400 border-dashed pb-1 text-[9px] text-zinc-400">
                        Sign:
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Verification & Signatures */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-400 text-[11px]">
            <div>
              <div className="text-zinc-500">Prepared By (Agronomist):</div>
              <div className="font-bold text-zinc-900 mt-1">Agaate Central Agronomy Team</div>
            </div>
            <div>
              <div className="text-zinc-500">Verified By (Farm Manager):</div>
              <div className="border-b border-zinc-400 mt-5 border-dashed"></div>
            </div>
            <div>
              <div className="text-zinc-500">Client / Farm Owner Inspection:</div>
              <div className="border-b border-zinc-400 mt-5 border-dashed"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
