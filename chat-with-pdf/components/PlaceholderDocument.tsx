'use client' // this is a client-side component because it renders on the browser (interactive component)
import React from 'react'
import { Button } from './ui/button'
import { CirclePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'


function PlaceholderDocument() {

    const router = useRouter(); // allows me to send the user to different pages

    // Push user to the upgrade page
    const handleClick = () => {
        // Check if the user is in the FREE tier and if they're over the file limit, push to upgrade page
        router.push('/dashboard/upload')

    }


  return (
    <Button onClick={handleClick} className='flex flex-col items-center justify-center w-64 h-80 rounded-xl bg-gray-200 drop-shadow-md text-gray-400'>

        <CirclePlus className='h-16 w-16'/>
        <p>Add a document</p>
    

    </Button>

)
}

export default PlaceholderDocument
