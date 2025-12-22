"use client";

import Modal from "../../ui/Modal";
import Form from "../../ui/Form";
import FormField from "../../ui/FormField";
import FormActions from "../../ui/FormActions";
import type { World, WorldEntity } from "../../../../lib/clients/worldClient";

interface CampaignModalsProps {
  // Modal states
  campaignModalOpen: boolean;
  sessionModalOpen: boolean;
  playerModalOpen: boolean;
  storyArcModalOpen: boolean;
  storyArcEventModalOpen: boolean;
  sceneModalOpen: boolean;

  // Conditions
  selectedCampaignId: string | null;
  selectedStoryArcId: string | null;
  selectedSessionId: string | null;

  // Form values
  campaignName: string;
  campaignSummary: string;
  sessionName: string;
  playerUsername: string;
  storyArcName: string;
  storyArcSummary: string;
  sceneName: string;
  sceneSummary: string;
  sceneWorldId: string;
  selectedEventId: string | null;

  // Form setters
  setCampaignName: (value: string) => void;
  setCampaignSummary: (value: string) => void;
  setSessionName: (value: string) => void;
  setPlayerUsername: (value: string) => void;
  setStoryArcName: (value: string) => void;
  setStoryArcSummary: (value: string) => void;
  setSceneName: (value: string) => void;
  setSceneSummary: (value: string) => void;
  setSceneWorldId: (value: string) => void;
  setSelectedEventId: (value: string | null) => void;

  // Handlers
  onCloseCampaignModal: () => void;
  onCloseSessionModal: () => void;
  onClosePlayerModal: () => void;
  onCloseStoryArcModal: () => void;
  onCloseStoryArcEventModal: () => void;
  onCloseSceneModal: () => void;
  onCreateCampaign: (e: React.FormEvent) => void;
  onCreateSession: (e: React.FormEvent) => void;
  onAddPlayer: (e: React.FormEvent) => void;
  onCreateStoryArc: (e: React.FormEvent) => void;
  onAddEventToStoryArc: (e: React.FormEvent) => void;
  onCreateScene: (e: React.FormEvent) => void;

  // Options
  worlds: World[];
  allEvents: WorldEntity[];
}

export default function CampaignModals({
  campaignModalOpen,
  sessionModalOpen,
  playerModalOpen,
  storyArcModalOpen,
  storyArcEventModalOpen,
  sceneModalOpen,
  selectedCampaignId,
  selectedStoryArcId,
  selectedSessionId,
  campaignName,
  campaignSummary,
  sessionName,
  playerUsername,
  storyArcName,
  storyArcSummary,
  sceneName,
  sceneSummary,
  sceneWorldId,
  selectedEventId,
  setCampaignName,
  setCampaignSummary,
  setSessionName,
  setPlayerUsername,
  setStoryArcName,
  setStoryArcSummary,
  setSceneName,
  setSceneSummary,
  setSceneWorldId,
  setSelectedEventId,
  onCloseCampaignModal,
  onCloseSessionModal,
  onClosePlayerModal,
  onCloseStoryArcModal,
  onCloseStoryArcEventModal,
  onCloseSceneModal,
  onCreateCampaign,
  onCreateSession,
  onAddPlayer,
  onCreateStoryArc,
  onAddEventToStoryArc,
  onCreateScene,
  worlds,
  allEvents
}: CampaignModalsProps) {
  return (
    <>
      <Modal
        isOpen={campaignModalOpen}
        onClose={onCloseCampaignModal}
        title="Create campaign"
        variant="styled"
      >
        <Form onSubmit={onCreateCampaign}>
          <FormField
            label="Campaign name"
            value={campaignName}
            onChange={setCampaignName}
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
          />
          <FormField
            label="Summary"
            value={campaignSummary}
            onChange={setCampaignSummary}
            type="textarea"
            rows={3}
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
          />
          <FormActions
            onCancel={onCloseCampaignModal}
            submitLabel="Save campaign"
            variant="styled"
          />
        </Form>
      </Modal>

      {sessionModalOpen && selectedCampaignId && (
        <Modal
          isOpen={sessionModalOpen}
          onClose={onCloseSessionModal}
          title="Add session"
          variant="styled"
        >
          <Form onSubmit={onCreateSession}>
            <FormField
              label="Session name"
              value={sessionName}
              onChange={setSessionName}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormActions
              onCancel={onCloseSessionModal}
              submitLabel="Save session"
              variant="styled"
            />
          </Form>
        </Modal>
      )}

      {sceneModalOpen && selectedSessionId && (
        <Modal
          isOpen={sceneModalOpen}
          onClose={onCloseSceneModal}
          title="Add scene"
          variant="styled"
        >
          <Form onSubmit={onCreateScene}>
            <FormField
              label="Scene name"
              value={sceneName}
              onChange={setSceneName}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormField
              label="Summary"
              value={sceneSummary}
              onChange={setSceneSummary}
              type="textarea"
              rows={3}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormField
              label="World"
              type="select"
              value={sceneWorldId}
              onChange={setSceneWorldId}
              options={worlds.map((world) => ({ value: world.id, label: world.name }))}
              placeholder="Select a world"
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormActions
              onCancel={onCloseSceneModal}
              submitLabel="Save scene"
              variant="styled"
            />
          </Form>
        </Modal>
      )}

      {playerModalOpen && selectedCampaignId && (
        <Modal
          isOpen={playerModalOpen}
          onClose={onClosePlayerModal}
          title="Add player"
          variant="styled"
        >
          <Form onSubmit={onAddPlayer}>
            <FormField
              label="Player username"
              value={playerUsername}
              onChange={setPlayerUsername}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormActions
              onCancel={onClosePlayerModal}
              submitLabel="Save player"
              variant="styled"
            />
          </Form>
        </Modal>
      )}

      {storyArcModalOpen && selectedCampaignId && (
        <Modal
          isOpen={storyArcModalOpen}
          onClose={onCloseStoryArcModal}
          title="Add story arc"
          variant="styled"
        >
          <Form onSubmit={onCreateStoryArc}>
            <FormField
              label="Story arc name"
              value={storyArcName}
              onChange={setStoryArcName}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormField
              label="Summary"
              value={storyArcSummary}
              onChange={setStoryArcSummary}
              type="textarea"
              rows={3}
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormActions
              onCancel={onCloseStoryArcModal}
              submitLabel="Save story arc"
              variant="styled"
            />
          </Form>
        </Modal>
      )}

      {storyArcEventModalOpen && selectedStoryArcId && (
        <Modal
          isOpen={storyArcEventModalOpen}
          onClose={onCloseStoryArcEventModal}
          title="Add event to story arc"
          variant="styled"
        >
          <Form onSubmit={onAddEventToStoryArc}>
            <FormField
              label="Event"
              type="select"
              value={selectedEventId || ""}
              onChange={setSelectedEventId}
              options={allEvents.map((event) => ({ value: event.id, label: event.name }))}
              placeholder="Select an event"
              style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
            />
            <FormActions
              onCancel={onCloseStoryArcEventModal}
              submitLabel="Save"
              variant="styled"
            />
          </Form>
        </Modal>
      )}
    </>
  );
}
