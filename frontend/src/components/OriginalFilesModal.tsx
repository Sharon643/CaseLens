import type { OriginalEvidenceFile } from "../api/caseApi";

interface OriginalFilesModalProps {
  caseFiles: OriginalEvidenceFile[];
  caseFilesLoading: boolean;
  caseFilesError: string | null;
  fileSearch: string;
  onFileSearchChange: (value: string) => void;
  onClose: () => void;
  onOpenEvidence: (id: number) => void;
}

export default function OriginalFilesModal({
  caseFiles,
  caseFilesLoading,
  caseFilesError,
  fileSearch,
  onFileSearchChange,
  onClose,
  onOpenEvidence,
}: OriginalFilesModalProps) {
  const filteredFiles = caseFiles.filter((file) =>
    file.original_filename
      .toLowerCase()
      .includes(fileSearch.trim().toLowerCase())
  );

  return (
    <div className="original-files-overlay" onClick={onClose}>
      <section
        className="original-files-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="original-files-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-header">
          <div>
            <h2 id="original-files-title">Original Evidence Files</h2>
            <p>{caseFiles.length} files associated with this case</p>
          </div>
          <button
            type="button"
            className="evidence-viewer-close"
            onClick={onClose}
            aria-label="Close original files panel"
          >
            ×
          </button>
        </div>

        <input
          type="search"
          className="original-files-search"
          placeholder="Search filenames..."
          value={fileSearch}
          onChange={(event) => onFileSearchChange(event.target.value)}
        />

        {caseFilesLoading && (
          <p className="empty-detail">Loading original files...</p>
        )}

        {caseFilesError && (
          <p className="details-error">{caseFilesError}</p>
        )}

        {!caseFilesLoading && !caseFilesError && (
          <div className="original-files-list">
            {filteredFiles.map((file) => (
              <article className="original-files-item" key={file.id}>
                <div className="original-files-info">
                  <strong>{file.original_filename}</strong>
                  <span>
                    Evidence #{file.id}
                    {" · "}
                    {file.file_type || "Unknown type"}
                    {" · "}
                    {file.available_on_disk ? "Available" : "Missing on disk"}
                  </span>
                  {file.file_size != null && (
                    <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                  )}
                </div>

                <button
                  type="button"
                  className="finding-timeline-button"
                  disabled={!file.available_on_disk}
                  onClick={() => onOpenEvidence(file.id)}
                >
                  Open evidence →
                </button>
              </article>
            ))}

            {filteredFiles.length === 0 && (
              <p className="empty-detail">No matching files found.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
