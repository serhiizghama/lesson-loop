/** What every scene component is handed: nothing but the class that sizes it. */
export type SceneProps = { className?: string | undefined }

export type SceneComponent = (props: SceneProps) => React.ReactElement
