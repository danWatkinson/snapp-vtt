Feature: World builder uploads and references digital assets

  As a World Builder
  I want to upload digital assets such as images and sound files
  So that I can reference them while constructing worlds

  Background:
    Given there is an admin user
    And there is a world builder
    And world "Eldoria" exists

  Scenario: World builder uploads an asset and views it in a modal
    When the world builder uploads an image asset "approaching-nuln.jpg"
    Then the image asset "approaching-nuln.jpg" appears in the assets list

  Scenario: World builder uploads an audio asset for use in a scene
    When the world builder uploads an audio asset "forest-ambience.mp3"
    Then the audio asset "forest-ambience.mp3" appears in the assets list

  Scenario: World builder references an uploaded image asset in a world entity
    Given an asset
    And a location
    When the world builder sets the image asset for the location the asset
    Then the location shows the image asset in the UI

  @skip
  Scenario: World builder references an uploaded audio asset in a scene
    When the world builder signs in to the system
    And campaign "The Eldorian Saga" exists
    And the world builder ensures scene "Into the Woods" exists in session "Session 1"
    And the world builder sets the ambience audio asset for scene "Into the Woods" to "forest-ambience.mp3"
    Then the scene "Into the Woods" shows audio asset "forest-ambience.mp3" as the ambience track in the UI
