import Documents from "@/components/Documents"

export const dynamic = 'force-dynamic'  // server-side rendered (gets latest info)


function Dashboard() {
  return (
    <div className="h-full max-w-7xl mx-auto">
      <h1 className="text-3xl p-5 bg-gray-100 font-extralight text-indigo-600">

        {/* Map through the documents */}





        {/* PlaceholderDocument */}

        



        My Documents
      </h1>

      <Documents />
    </div>
  )
}

export default Dashboard
