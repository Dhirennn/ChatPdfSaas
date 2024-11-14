'use client'

import React from 'react'
import {useDropzone} from 'react-dropzone'
import { useCallback } from 'react'
import { 
    CheckCircleIcon,
    CircleArrowDown,
    HammerIcon,
    RocketIcon,
    SaveIcon 
    } from 'lucide-react'

function FileUploader() {

    // when a person drops a file, it triggers this onDrop function then we can do stuff with the files
    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Do something with the files
        console.log(acceptedFiles)

      }, [])
      const {getRootProps, getInputProps, isDragActive, isFocused, isDragAccept} = useDropzone({onDrop})


  return (
    <div className='flex flex-col gap-4 items-center'>

        {/* Loading Section */}


        <div {...getRootProps()}
            className={`p-10 border-2 border-dashed mt-10 w-[70%] border-indigo-600 text-indigo-600 rounded-lg h-96 flex items-center justify-center ${isFocused || isDragAccept ? "bg-indigo-300" : "bg-indigo-100"}`}
        >
        <input {...getInputProps()} />
        {
            <div className='flex flex-col items-center justify-center'>
                {isDragActive ? (
                    <div className='flex flex-col items-center justify-center'>

                        <RocketIcon className='h-20 w-20 animate-ping'/>

                        <p>Drop the files here ...</p>     
                    </div>) 
                    
                    : (
                    
                <div className='flex flex-col items-center justify-center'>

                    <CircleArrowDown className='h-20 w-20 animate-bounce'/>
                    <p>Drag 'n' drop some files here, or click to select files</p>
                </div>
                )}
            </div>
        }
        </div>
    </div>
  )
}

export default FileUploader
