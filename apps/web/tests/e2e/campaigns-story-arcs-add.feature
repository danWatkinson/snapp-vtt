Feature: Game master adds story arcs to a campaign

  As a Game Master
  I want to add story arcs to my campaign
  So that I can track major narrative threads

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Game master can add Story Arcs to a Campaign
    When the admin signs in to the system as "admin"
    And the campaign "Rise of the Dragon King" exists with story arcs view
    And the admin ensures story arc "The Ancient Prophecy" exists
    Then story arc "The Ancient Prophecy" appears in the story arcs list
