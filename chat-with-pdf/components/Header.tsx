import React from 'react'
import Link from "next/link"
import { SignedIn } from '@clerk/nextjs'
import { UserButton } from '@clerk/nextjs'
import { Button } from './ui/button'
import { FilePlus } from 'lucide-react'

function Header() {
  return (
    <div className='flex justify-between bg-white shadow-sm p-5 border-b'>
      <Link
        href="/dashboard"
        className='text-2xl'
      >
        Chat to <span className='text-indigo-600'>PDF</span>
      </Link>

      <SignedIn>
        <div className='flex items-center space-x-2'>

          <Button asChild variant="link" className='hidden md:flex'>
            <Link href="/dashboard/upgrade">Pricing</Link>
          </Button>


          <Button asChild variant="outline" className='hidden md:flex'>
            <Link href="/dashboard">My Documents</Link>
          </Button>

          <Button asChild variant="outline" className='hidden md:flex'>
            <Link href="/dashboard/upload">

              <FilePlus className='text-indigo-600'></FilePlus>

            </Link>
          </Button>



          {/* Upgrade Button */}
          <UserButton>

          </UserButton>
        </div>

      </SignedIn>


    </div>
  )
}

export default Header
