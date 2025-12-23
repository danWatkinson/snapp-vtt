"use client";

import Modal from "../../ui/Modal";
import Form from "../../ui/Form";
import FormField from "../../ui/FormField";
import FormActions from "../../ui/FormActions";
import CreateFormModal from "../../ui/CreateFormModal";
import { STYLED_INPUT_STYLE } from "../../../styles/constants";
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
      <CreateFormModal
        isOpen={campaignModalOpen}
        onClose={onCloseCampaignModal}
        title="Create campaign"
        submitLabel="Save campaign"
        onSubmit={onCreateCampaign}
        nameLabel="Campaign name"
        nameValue={campaignName}
        onNameChange={setCampaignName}
        summaryLabel="Summary"
        summaryValue={campaignSummary}
        onSummaryChange={setCampaignSummary}
      />

      {sessionModalOpen && selectedCampaignId && (
        <CreateFormModal
          isOpen={sessionModalOpen}
          onClose={onCloseSessionModal}
          title="Add session"
          submitLabel="Save session"
          onSubmit={onCreateSession}
          nameLabel="Session name"
          nameValue={sessionName}
          onNameChange={setSessionName}
        />
      )}

      {sceneModalOpen && selectedSessionId && (
        <CreateFormModal
          isOpen={sceneModalOpen}
          onClose={onCloseSceneModal}
          title="Add scene"
          submitLabel="Save scene"
          onSubmit={onCreateScene}
          nameLabel="Scene name"
          nameValue={sceneName}
          onNameChange={setSceneName}
          summaryLabel="Summary"
          summaryValue={sceneSummary}
          onSummaryChange={setSceneSummary}
          additionalFields={
            <FormField
              label="World"
              type="select"
              value={sceneWorldId}
              onChange={setSceneWorldId}
              options={worlds.map((world) => ({ value: world.id, label: world.name }))}
              placeholder="Select a world"
              style={STYLED_INPUT_STYLE}
            />
          }
        />
      )}

      {playerModalOpen && selectedCampaignId && (
        <CreateFormModal
          isOpen={playerModalOpen}
          onClose={onClosePlayerModal}
          title="Add player"
          submitLabel="Save player"
          onSubmit={onAddPlayer}
          nameLabel="Player username"
          nameValue={playerUsername}
          onNameChange={setPlayerUsername}
        />
      )}

      {storyArcModalOpen && selectedCampaignId && (
        <CreateFormModal
          isOpen={storyArcModalOpen}
          onClose={onCloseStoryArcModal}
          title="Add story arc"
          submitLabel="Save story arc"
          onSubmit={onCreateStoryArc}
          nameLabel="Story arc name"
          nameValue={storyArcName}
          onNameChange={setStoryArcName}
          summaryLabel="Summary"
          summaryValue={storyArcSummary}
          onSummaryChange={setStoryArcSummary}
        />
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
              style={STYLED_INPUT_STYLE}
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
