Feature: Game master adds events to story arcs

  As a Game Master
  I want to add events to story arcs
  So that I can track key moments in narrative threads

  Background:
    Given there is an admin user
    And the test campaign exists

  Scenario: Game master can add Events to a Story Arc
    When the admin signs in to the system
    And story arc "The Ancient Prophecy" exists
    And the admin views events for story arc "The Ancient Prophecy"
    And world event "The Prophecy Revealed" exists
    And the admin adds event "The Prophecy Revealed" to the story arc
    Then event "The Prophecy Revealed" appears in the story arc's events list
