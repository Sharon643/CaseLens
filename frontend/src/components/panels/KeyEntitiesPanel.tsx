import type { CaseSummary } from "../../api/caseApi";

interface KeyEntitiesPanelProps {
  summary: CaseSummary;
}

export default function KeyEntitiesPanel({ summary }: KeyEntitiesPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Key Entities</h2>
          <span>{summary.entity_count} detected</span>
        </div>
      </div>

      <div className="entity-list">
        {/* ACTORS */}
        <div className="entity-section">
          <h3>Actors</h3>
          {summary.actors.map((actor: string) => (
            <div className="entity-item" key={actor}>
              <span className="entity-dot person" />
              {actor}
            </div>
          ))}
        </div>

        {/* DEVICES */}
        <div className="entity-section">
          <h3>Devices</h3>
          {summary.devices.map((device: string) => (
            <div className="entity-item" key={device}>
              <span className="entity-dot device" />
              {device}
            </div>
          ))}
        </div>

        {/* FILES */}
        <div className="entity-section">
          <h3>Files</h3>
          {summary.files.map((file: string) => (
            <div className="entity-item" key={file}>
              <span className="entity-dot file" />
              {file}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
