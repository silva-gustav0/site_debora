/** Esqueleto mostrado no mesmo instante do toque, enquanto os dados da tela chegam do servidor. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="animate-pulse">
      <div className="h-3 w-24 rounded bg-[#EFE4D2] mb-3" />
      <div className="h-10 w-64 max-w-full rounded-lg bg-[#EFE4D2] mb-7" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-white border border-[#EEE5D8]" />)}
      </div>
      <div className="h-72 rounded-2xl bg-white border border-[#EEE5D8]" />
    </div>
  );
}
