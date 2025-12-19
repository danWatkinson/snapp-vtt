Feature: Game master automatically gets story arcs for players

  As a Game Master
  I want story arcs to be automatically created for each player
  So that I can track individual character narratives

  Background:
    Given there is an admin user

  Scenario: Game master automatically gets a Story Arc for each Player added to a Campaign
    When the admin signs in to the system
    And the campaign "Rise of the Dragon King" exists with players view
    And the admin ensures player "bob" is added to the campaign
    And the admin navigates to the story arcs view
    Then a story arc named "bob's Arc" is automatically created
