type BadgeCampoPendenteProps = {
    missing: boolean;
    missingLabel: string;
    value: string;
    className?: string;
};

export default function BadgeCampoPendente({
    missing,
    missingLabel,
    value,
    className = "",
}: BadgeCampoPendenteProps) {
    if (missing) {
        return (
            <span
                className={`rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-500 ${className}`}
            >
                {missingLabel}
            </span>
        );
    }

    return (
        <span
            className={`rounded-full bg-[#EEF7EE] px-3 py-1 text-xs font-medium text-[#4D6B4D] ${className}`}
        >
            {value}
        </span>
    );
}
