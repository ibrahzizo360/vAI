import { Sidebar } from "@/components/custom/sidebar"

export default function Loading() {
  return (
    <div className="relative flex min-h-screen bg-secondary">
      <Sidebar />
      <div className="flex-1 md:ml-20 flex flex-col">
        <header className="flex items-center justify-between p-4 bg-primary text-white shadow-md sticky top-0 z-10">
          <h1 className="text-xl font-bold ml-12 md:ml-0">Transcript History</h1>
          <div className="h-5 w-20 bg-white/20 rounded animate-pulse"></div>
        </header>
        <main className="flex-1 p-4 pb-28">
          <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-5 bg-gray-300 rounded w-1/2 mb-6"></div>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="h-12 bg-gray-300 rounded-lg flex-1"></div>
                <div className="flex gap-2">
                  <div className="h-12 w-24 bg-gray-300 rounded-lg"></div>
                  <div className="h-12 w-24 bg-gray-300 rounded-lg"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="h-5 bg-gray-300 rounded mb-1 w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="h-6 w-20 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="h-4 bg-gray-300 rounded mb-2 w-full"></div>
                    <div className="h-4 bg-gray-300 rounded mb-3 w-2/3"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
