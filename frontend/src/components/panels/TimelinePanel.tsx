import type { CaseTimelineEvent, PossibleTransfer } from "../../types";

interface TimelinePanelProps {
  timelineEvents: CaseTimelineEvent[];
  filteredTimelineEvents: CaseTimelineEvent[];
  timelineEventTypes: string[];
  timelineLoading: boolean;
  timelineError: string | null;
  timelineSearch: string;
  timelineTypeFilter: string;
  usbOnly: boolean;
  activeFinding: PossibleTransfer | null;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onUsbOnlyChange: (checked: boolean) => void;
  onClearFilters: () => void;
  onSelectEvidence: (id: number) => void;
}

export default function TimelinePanel({
  timelineEvents,
  filteredTimelineEvents,
  timelineEventTypes,
  timelineLoading,
  timelineError,
  timelineSearch,
  timelineTypeFilter,
  usbOnly,
  activeFinding,
  onSearchChange,
  onTypeFilterChange,
  onUsbOnlyChange,
  onClearFilters,
  onSelectEvidence,
}: TimelinePanelProps) {
  return (
    <section id="case-event-timeline" className="panel timeline-panel">
      <div className="panel-header timeline-header">
        <div className="timeline-heading">
          <h2>Event Timeline</h2>
          <span>
            Showing {filteredTimelineEvents.length} of {timelineEvents.length}{" "}
            events
          </span>
        </div>
      </div>

      <div className="timeline-filters">
        <input
          type="search"
          className="timeline-search"
          placeholder="Search events, files..."
          value={timelineSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search timeline events"
        />

        <select
          className="timeline-type-filter"
          value={timelineTypeFilter}
          onChange={(event) => onTypeFilterChange(event.target.value)}
          aria-label="Filter by event type"
        >
          <option value="all">All event types</option>
          {timelineEventTypes.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <label className="timeline-usb-filter">
          <input
            type="checkbox"
            checked={usbOnly}
            onChange={(event) => onUsbOnlyChange(event.target.checked)}
          />
          USB activity
        </label>

        <button
          type="button"
          className="timeline-clear-button"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </div>

      <div className="timeline-list">
        {timelineLoading && (
          <p className="timeline-message">Loading investigation events...</p>
        )}

        {timelineError && !timelineLoading && (
          <p className="timeline-message timeline-error">{timelineError}</p>
        )}

        {!timelineLoading && !timelineError && filteredTimelineEvents.length === 0 && (
          <p className="timeline-message">
            No matching events. Try changing or clearing your filters.
          </p>
        )}

        {!timelineLoading &&
          !timelineError &&
          filteredTimelineEvents.map((event) => {
            const isUsbActivity =
              event.description?.includes("USB-4471") ?? false;

            const matchesActiveFinding =
              activeFinding !== null &&
              activeFinding.timestamp !== null &&
              event.timestamp !== null &&
              Math.abs(
                new Date(event.timestamp).getTime() -
                  new Date(activeFinding.timestamp).getTime()
              ) < 1000 &&
              activeFinding.supporting_evidence.some(
                (source) => source.evidence_id === event.evidence_id
              );

            return (
              <article
                key={event.id}
                className={[
                  "timeline-event",
                  isUsbActivity ? "timeline-event-usb" : "",
                  matchesActiveFinding ? "timeline-event-finding-match" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="timeline-event-marker" />

                <div className="timeline-event-content">
                  <div className="timeline-event-top">
                    <span className="timeline-event-type">
                      {event.event_type.replaceAll("_", " ")}
                    </span>

                    {isUsbActivity && (
                      <span className="timeline-usb-badge">USB ACTIVITY</span>
                    )}

                    {matchesActiveFinding && (
                      <span className="timeline-finding-match-badge">
                        MATCHED TO FINDING
                      </span>
                    )}
                  </div>

                  <div className="timeline-event-time">
                    {event.timestamp
                      ? `${new Date(event.timestamp).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                          timeZone: "UTC",
                        })} UTC`
                      : "Timestamp unavailable"}
                  </div>

                  <p className="timeline-event-description">
                    {event.description || "No description available."}
                  </p>

                  <button
                    type="button"
                    className="timeline-source-button"
                    onClick={() => onSelectEvidence(event.evidence_id)}
                  >
                    <span aria-hidden="true">↗</span>
                    {event.evidence_filename}
                    <span className="timeline-source-id">
                      Evidence #{event.evidence_id}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
