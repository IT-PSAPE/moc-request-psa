import { useEffect, useRef } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { useFeedback } from '@/components/feedback/feedback-provider'

export function ServiceWorkerRegistrar() {
    const { notify } = useFeedback()
    const registeredRef = useRef(false)

    useEffect(() => {
        if (registeredRef.current) return
        registeredRef.current = true

        const updateSW = registerSW({
            onNeedRefresh() {
                notify({
                    title: 'Update available',
                    description: 'A new version of MOC Request is ready.',
                    variant: 'info',
                    action: {
                        label: 'Reload',
                        onClick: () => {
                            updateSW(true)
                        },
                    },
                })
            },
        })
    }, [notify])

    return null
}
