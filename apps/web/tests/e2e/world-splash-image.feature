Feature: World builder sets a splash image for a world

  As a World Builder
  I want to provide a splash image for my world
  So that I can start to set the tone of my world from the outset

  Background:
    Given there is an admin user
    And world "Eldoria" exists

  Scenario: World builder sets a splash image for a world from existing assets
    When the admin signs in to the system
    And the admin uploads an image asset "approaching-nuln.jpg"
    And the image asset "approaching-nuln.jpg" appears in the assets list
    And the admin opens the world settings for "Eldoria"
    And the admin sets the splash image for world "Eldoria" to "approaching-nuln.jpg"
    Then the world "Eldoria" shows splash image "approaching-nuln.jpg" in the world header

  Scenario: World splash image appears in the world selector
    When the admin signs in to the system
    And the admin uploads an image asset "approaching-nuln.jpg"
    And the image asset "approaching-nuln.jpg" appears in the assets list
    And the admin opens the world settings for "Eldoria"
    And the admin sets the splash image for world "Eldoria" to "approaching-nuln.jpg"
    Then the world selector shows a splash thumbnail for "Eldoria" using "approaching-nuln.jpg"

  Scenario: World without a splash image shows a clear placeholder
    When the admin signs in to the system
    And world "NoSplashWorld" exists
    And the admin navigates to the "World Entities" planning screen
    And the admin selects world "NoSplashWorld"
    Then the world "NoSplashWorld" shows a "no splash image" placeholder in the world header
    And the world selector shows a "no splash image" placeholder for "NoSplashWorld"