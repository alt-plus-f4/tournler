'use client'

import CloseModal from '@/components/CloseModal'
import SignUp from '@/components/SignUp'
import { useRouter } from 'next/navigation'

const Page = () => {
  const router = useRouter()

  return (
    <div className='fixed inset-0 backdrop-blur-sm z-10' onClick={() => router.back()}>
        <div className='container flex items-center w-full h-full max-w-lg mx-auto'>
            <div className='relative bg-popupcolor border-2 w-full h-fit py-20 px-2 rounded-lg' onClick={(e) => e.stopPropagation()}>
                <div className='absolute top-4 right-4'>
                    <CloseModal />
                </div>
                <SignUp />
            </div>
        </div>
    </div>
  )
}

export default Page