Feature: World builder creates nested factions

  As a World Builder
  I Want to create nested factions
  So That I can create a believable world

  Background:
    Given there is an admin user

  Scenario: World builder can create a nested faction with sub-factions
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with factions tab
    And the admin ensures faction "Priesthood" exists
    And the admin creates faction "Militant Priests"
    And the admin creates faction "Pacifist Priests"
    And the admin links faction "Militant Priests" as sub-faction of "Priesthood"
    And the admin links faction "Pacifist Priests" as sub-faction of "Priesthood"
    Then faction "Priesthood" shows it has sub-faction "Militant Priests"
    And faction "Priesthood" shows it has sub-faction "Pacifist Priests"
    And faction "Militant Priests" shows it is part of "Priesthood"
    And faction "Pacifist Priests" shows it is part of "Priesthood"

  Scenario: World builder can view sub-factions when viewing a nested faction
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with factions tab
    And the admin ensures faction "Merchant Guild" exists
    And the admin creates faction "Traders Guild"
    And the admin creates faction "Craftsmen Guild"
    And the admin links faction "Traders Guild" as sub-faction of "Merchant Guild"
    And the admin links faction "Craftsmen Guild" as sub-faction of "Merchant Guild"
    And the admin views faction "Merchant Guild"
    Then faction "Merchant Guild" displays sub-factions:
      | Traders Guild |
      | Craftsmen Guild |
