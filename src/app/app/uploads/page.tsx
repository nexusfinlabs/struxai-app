export default function UploadsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Subir archivos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Drag and drop para CAD y Revit. (Implementacion completa: Dia 5-6)
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Archivos CAD (.dwg, .dxf)</p>
          <p className="mt-2 text-xs text-slate-500">Proximamente Dia 5-6</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Archivos Revit (.rvt, .rfa, .rte)</p>
          <p className="mt-2 text-xs text-slate-500">Proximamente Dia 5-6</p>
        </div>
      </div>
    </div>
  );
}
