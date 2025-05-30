import React from 'react'

const Hero = () => {
  return (
    <div className='flex mx-9  h-full'>
      <div className='w-8/12 flex flex-col items-start justify-center  px-30'>
        <h1 className='text-7xl'>Open Source video conferencing & calling app</h1>
        <h3 className='text-4xl text-EPin py-8'>Secure . Scalable . OpenSource</h3>
      </div>
      <div className='w-4/12'>
        <img src="https://res.cloudinary.com/dtntjxdio/image/upload/v1748594430/loopmeet_Hero_blxjyo.png" alt="Hero"  className='px-'/>
      </div>
    </div>
  )
}

export default Hero
 