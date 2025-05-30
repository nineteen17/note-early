import Image from "next/image";
export const NoteEarlyLogo = ({ className }: { className?: string }) => {

    return (
        <div className={`flex items-center gap-2 font-bold text-lg ${className}`}>
            <Image 
                src="/note-early-icon-logo.png" 
                alt="NoteEarly Logo"
                width={32}
                height={32}
                className="h-8 w-auto rounded-full"
            />
            NoteEarly
        </div>
    )
};

export const NoteEarlyLogoLarge = ({
    className
    }: {
    className?: string
    }) => {
    return (
        <div className={`flex flex-col items-center gap-4 mb-8 ${className}`}>
            <div className="relative w-24 h-24">
                <Image
                    src="/note-early-icon-logo.png"
                    alt="NoteEarly Logo"
                    fill
                    className="rounded-full object-cover shadow-lg"
                />
            </div>
            <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground">NoteEarly</h1>
            </div>
        </div>
    );
};