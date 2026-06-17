'use client'

import { motion } from 'framer-motion'
import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 select-none">
      <div className="text-center">
        <motion.img
          src="/images/pbctf-logo.svg"
          alt="PBCTF 5.0"
          className="w-[260px] md:w-[420px] mx-auto select-none"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 1, 0.3],
            filter: [
              "drop-shadow(0 0 20px rgba(34,197,94,0.3))",
              "drop-shadow(0 0 40px rgba(34,197,94,0.6))",
              "drop-shadow(0 0 20px rgba(34,197,94,0.3))",
            ]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <div className="mt-8">
        <div className="mt-8">
          <Spinner size="xl" />
        </div>
        </div>
      </div>
    </div>
  )
}
