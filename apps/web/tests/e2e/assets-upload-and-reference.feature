Feature: World builder uploads and references digital assets

  As a World Builder
  I want to upload digital assets such as images and sound files
  So that I can reference them while constructing worlds

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: World builder uploads an image asset for use in a world
    When the world builder signs in to the system as "worldbuilder"
    And the world builder navigates to the "Assets" library screen
    And the world builder uploads an image asset "approaching-nuln.jpg"
    Then the image asset "approaching-nuln.jpg" appears in the assets list
    And the image asset "approaching-nuln.jpg" displays a thumbnail in the assets list

  Scenario: World builder views an image asset in a modal
    When the world builder signs in to the system as "worldbuilder"
    And the world builder navigates to the "Assets" library screen
    And the world builder uploads an image asset "approaching-nuln.jpg"
    And the world builder clicks the thumbnail for image asset "approaching-nuln.jpg"
    Then a modal opens displaying the full image for "approaching-nuln.jpg"
    When the world builder closes the image modal
    Then the modal is no longer visible

  Scenario: World builder uploads an audio asset for use in a scene
    When the world builder signs in to the system as "worldbuilder"
    And the world builder navigates to the "Assets" library screen
    And the world builder uploads an audio asset "forest-ambience.mp3"
    Then the audio asset "forest-ambience.mp3" appears in the assets list

  Scenario: World builder references an uploaded image asset in a world entity
    When the world builder signs in to the system as "worldbuilder"
    And the world builder navigates to the "World Entities" planning screen
    And world "Eldoria" exists
    And the world builder selects world "Eldoria"
    And the world builder navigates to the locations tab
    And the world builder ensures location "Whispering Woods" exists
    And the world builder sets the image asset for location "Whispering Woods" to "approaching-nuln.jpg"
    Then the location "Whispering Woods" shows image asset "approaching-nuln.jpg" in the UI

  Scenario: World builder references an uploaded audio asset in a scene
    When the world builder signs in to the system as "worldbuilder"
    And the world builder navigates to the "Campaigns" planning screen
    And campaign "The Eldorian Saga" exists
    And the world builder selects campaign "The Eldorian Saga"
    And the world builder ensures session "Session 1" exists for campaign "The Eldorian Saga"
    And the world builder ensures scene "Into the Woods" exists in session "Session 1"
    And the world builder sets the ambience audio asset for scene "Into the Woods" to "forest-ambience.mp3"
    Then the scene "Into the Woods" shows audio asset "forest-ambience.mp3" as the ambience track in the UI
